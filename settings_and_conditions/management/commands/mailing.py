import json
import sys
import schedule
import time

from contextlib import suppress
from django.conf import settings
from django.core.mail import send_mail
from django.core.management import BaseCommand
from django.core.exceptions import ValidationError
from django.template import Template, Context
from django.template.loader import render_to_string
from django.urls import reverse
from redis.exceptions import ResponseError

from settings_and_conditions.models import NotificationType, Notification
from settings_and_conditions.notify_rollbar import notify_rollbar
from clients.models import RegistrationOrder, Client, Manager
from orders.models import Order


class Command(BaseCommand):
    def add_arguments(self, parser):
        parser.add_argument('--timeout', nargs='+', type=int, default=0, help='Run a command on a schedule with a specified timeout in minutes.')

    def handle(self, *args, **options):
        if options['timeout']:
            timeout, = options['timeout']
            while True:
                try:
                    schedule.every(timeout).minutes.do(launch_mailing)
                    while True:
                        time.sleep(60)
                        schedule.run_pending()
                        if not schedule.jobs:
                            break
                except Exception:
                    continue
        else:
            try:
                launch_mailing()
            finally:
                sys.exit(1)


def launch_mailing():

    def get_value(conn, key, field):
        if field == 'params':
            result = {}
            with suppress(json.decoder.JSONDecodeError):
                result = json.loads(conn.hmget(key, field)[0].decode()) 
        else:
            result = conn.hmget(key, field)[0].decode()
        return result

    fields = {'notification_type': '', 'id': '', 'url': '', 'params': ''}
    redis_storage = settings.REDIS_CONN
    tasks = redis_storage.keys()
    for key in tasks:
        with suppress(
                Order.DoesNotExist,
                Client.DoesNotExist,
                RegistrationOrder.DoesNotExist,
                Manager.DoesNotExist,
                NotificationType.DoesNotExist,
                ValidationError, ValueError, AttributeError, ResponseError
            ):

            with notify_rollbar():
                for field in fields.keys():
                    fields[field] = get_value(redis_storage, key, field)
                notification_type_obj = NotificationType.objects.filter(event=fields['notification_type']).first()
                if not notification_type_obj:
                    continue
                subject  = notification_type_obj.subject
                template = notification_type_obj.notification
                if not template:
                    raise ValidationError('Не указан шаблон письма', code='')

                email, context = get_context(**fields)
                recipient_list = get_recipient_list(notification_type_obj, email)

                send_email(context, recipient_list, subject=subject, template=template)

        redis_storage.delete(key)


def get_recipient_list(notification_type, email):
    result = []
    notifications = Notification.objects.filter(use_up=True, notification_type=notification_type)
    for notify in notifications:
        if notify.email:
            result = result + [notify.email]
        if  notify.notify in [
                Notification.NOTIFICATION_TO_MANAGERS,
                Notification.NOTIFICATION_CLIENTS_MANAGERS
            ] and notify.manager_talant and notify.manager_talant.email:
            result = result + [notify.manager_talant.email]
    if notifications.exclude(notify=Notification.NOTIFICATION_TO_MANAGERS):
        result = result + [email]
    return list(set(result))


def get_context(notification_type, id, url, params):
    result = {}

    if notification_type == NotificationType.REG_REQUEST:
        obj = RegistrationOrder.objects.get(id=id)
        email = obj.email
        if not email:
            raise ValidationError('Не указан email менеджера talant', code='')
        
        result = email, params

    if notification_type == NotificationType.CONFIM_ORDER:
        obj = Order.objects.get(id=id)
        email = obj.client.manager.values_list('email', flat=True).first()
        manager_talant = obj.client.registration_order.manager_talant
        if not manager_talant:
            raise ValidationError('Не указан менеджер talant', code='')
        # email = manager_talant.email
        if not email:
            raise ValidationError('Не указан email менеджера talant', code='')
        
        result = email, {
            'id'        : obj.id,
            'created_at': obj.created_at,
            'client'    : obj.client,
            'manager'   : manager_talant.username
        }

    if notification_type == NotificationType.CONFIM_REG:
        client = Client.objects.get(id=id)
        manager = client.manager.first()
        email = manager.email
        if not email:
            raise ValidationError('Не указан email менеджера клиента', code='')
        result = email, {
            'url'     : url,
            'login'   : manager.login,
            'password': manager.password
        }

    if notification_type == NotificationType.CANCEL_REG:
        reg_order = RegistrationOrder.objects.get(pk=id)
        email = reg_order.email
        if not email:
            raise ValidationError('Не указан email в заявке на регистрацию', code='')
        result = email, {
            'url'     : url,
        } | params

    if notification_type == NotificationType.RECOVERY_PASS:
        client = Client.objects.get(inn=id)
        manager = client.manager.first()
        email = manager.email
        if not email:
            raise ValidationError('Не указан email менеджера клиента', code='')
        result = email, {
            'url'     : url,
        } | params

    if notification_type == NotificationType.LOCKED_CLIENT:
        client = Client.objects.get(pk=id)
        manager = client.manager.first()
        email = manager.email
        if not email:
            raise ValidationError('Не указан email менеджера клиента', code='')
        result = email, {
            'url'     : url,
        } | params

    if notification_type == NotificationType.GET_ORDER:
        pass

    return result


def send_email(context, recipient_list, **params):
    template = Template(params['template'])
    rendered_html = template.render(Context(context))
    html_content = render_to_string('forms/notify-template.html', {'params': rendered_html})
    send_mail(
        params['subject'],
        '',
        settings.EMAIL_HOST_USER,
        recipient_list,
        html_message=html_content
    )
