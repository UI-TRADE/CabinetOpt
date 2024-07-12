import json
import hashlib
import uuid

from functools import wraps
from django.db import transaction
# from django.conf import settings
from django.core.exceptions import ValidationError

from rest_framework import serializers

from clients.models import (RegistrationOrder, Client, Manager)
from orders.models import Order
from mailings.tasks import get_mail_params, create_outgoing_mail
from settings_and_conditions.models import NotificationType
from utils.requests import get_uri


class RegistrationOrderSerializer(serializers.ModelSerializer):
    class Meta:
        model = RegistrationOrder
        fields = "__all__"


class OrderSerializer(serializers.ModelSerializer):
    class Meta:
        model = Order
        fields = ['id', 'provision', 'created_at', 'client', 'status', 'manager', 'num_in_1C']


def notification_scheduling(arg1):
    def inner(func): 
        @wraps(func)
        def wrapper(arg2, *params):
            result = func(arg2, *params)
            if arg1 == NotificationType.REG_REQUEST:
                obj, created = result
                if created:
                    do_registration_request(obj)
            elif arg1 == NotificationType.CONFIM_REG:
                request, obj, form, *_ = params
                if form.cleaned_data.get('status') == 'registered':
                    approve_registration(request, obj, form.cleaned_data)
            elif arg1 == NotificationType.CANCEL_REG:
                request, obj, form, *_ = params
                if form.cleaned_data.get('status') == 'canceled':
                    cancel_registration(obj, form.cleaned_data)
            elif arg1 == NotificationType.CONFIM_ORDER:
                if params:
                    status_before, = params
                    if not arg2:
                        return result
                    if not arg2.status == 'confirmed' and not status_before == 'introductory':
                        return result
                    confirm_order(arg2)
            elif arg1 == NotificationType.GET_ORDER:
                if not params:
                    get_order(arg2)
            elif arg1 == NotificationType.RECOVERY_PASS:
                form, = params
                do_recovery_password(arg2, form.cleaned_data)
            elif arg1 == NotificationType.LOCKED_CLIENT:
                _, obj, form, *_ = params
                if form.cleaned_data.get('status') == 'locked':
                    locked_client(obj, form.cleaned_data)
            elif arg1 == NotificationType.NEW_MANAGER:
                cleaned_data, = params
                add_new_manager(cleaned_data)

            return result

        return wrapper
    return inner


def handle_notification():
    def wrap(func):
        @wraps(func)
        def run_func(*args):
            notification_options = func(*args)
            if notification_options:
                create_outgoing_mail(get_mail_params(notification_options))

        return run_func
    return wrap


@handle_notification()
def do_registration_request(obj):
    result = {
        'notification_type': 'registration_request',
        'id': obj.id,
        'url': '',
        'params': RegistrationOrderSerializer(obj).data
    }
    return result


@handle_notification()
def do_recovery_password(request, cleaned_data):
    login = cleaned_data['login']
    hash_id = hashlib.sha256(str(uuid.uuid4()).encode()).hexdigest()
    hash_login = hashlib.sha256(login.encode()).hexdigest()
    uri = get_uri(request, 'clients:recovery_pass', id=hash_id)
    result = {
        'notification_type': 'recovery_password',
        'id': login, 'url': f'{uri}?usr={hash_login}&email={cleaned_data["email"]}',
        'params': cleaned_data
    }
    return result


@handle_notification()
def approve_registration(request, obj, cleaned_data):

    if not cleaned_data.get('name_of_manager'):
        raise ValidationError('Не указано ФИО персонального менеджера', code='')

    with transaction.atomic():
        personal_manager, _ = Manager.objects.get_or_create(
            login = cleaned_data['login'],
            defaults = {
                key: value for key, value  in cleaned_data.items() if key in ['email', 'phone', 'password']
            } | {'name': cleaned_data['name_of_manager']}
        )
        client, created = Client.objects.update_or_create(
            inn=cleaned_data['identification_number'],
            defaults = {
                'name'              : cleaned_data['organization'],
                'registration_order': obj,
                'approved_by'       : request.user,
                'manager_talant'    : cleaned_data['manager_talant'],
        })
        if created:
            client.manager.add(personal_manager)

            hash_id = hashlib.sha256(str(uuid.uuid4()).encode()).hexdigest()
            hash_inn = hashlib.sha256(cleaned_data['identification_number'].encode()).hexdigest()
            uri = get_uri(request, 'clients:change_pass', id=hash_id)
            result = {
                'notification_type': 'confirm_registration',
                'id': client.id,
                'url': f'{uri}?usr={hash_inn}',
                'params': {key: value for key, value in cleaned_data.items() if not key in ['manager_talant','phone']}
            }
            return result


@handle_notification()
def confirm_order(order):
    result = {
        'notification_type': 'confirm_order',
        'id': order.id, 'url': '',
        'params': OrderSerializer(order).data
    }
    return result


@handle_notification()
def get_order(order):
    result = {
        'notification_type': 'get_order',
        'id': order.id, 'url': '',
        'params': OrderSerializer(order).data
    }
    return result


@handle_notification()
def cancel_registration(obj, cleaned_data):
    result = {
        'notification_type': 'cancel_registration',
        'id': obj.id,
        'url': '',
        'params': {key: value for key, value in cleaned_data.items() if not key in ['manager_talant','phone']}
    }
    return result


@handle_notification()
def locked_client(obj, cleaned_data):
    result = {
        'notification_type': 'locked_client',
        'id': obj.id,
        'url': '',
        'params': {key: value for key, value in cleaned_data.items() if key != 'manager_talant'}
    }
    return result


@handle_notification()
def add_new_manager(cleaned_data):
    try:
        obj = Manager.objects.get(email=cleaned_data['email'])
        result = {
            'notification_type': 'add_manager',
            'id': obj.id,
            'url': '',
            'params': {key: value for key, value in cleaned_data.items() if key != 'phone'}
        }
        return result
    except Manager.DoesNotExist:...
