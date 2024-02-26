import os
import base64
import schedule
import time

from contextlib import suppress
from django.conf import settings
from django.core.mail import send_mail
from django.core.management import BaseCommand
from django.core.exceptions import ValidationError
from django.template.loader import render_to_string
from django.urls import reverse
from redis.exceptions import ResponseError

from settings_and_conditions.models import Notification
from settings_and_conditions.notify_rollbar import notify_rollbar
from clients.models import RegistrationOrder, Manager
from orders.models import Order
from clients.utils import parse_of_name


class Command(BaseCommand):
    def handle(self, *args, **options):
        while True:
            try:
                with notify_rollbar():
                    schedule.every(1).hours.do(launch_mailing)
                    while True:
                        time.sleep(60)
                        schedule.run_pending()
                        if not schedule.jobs:
                            break
            except Exception:
                continue


def launch_mailing():
    redis_storage = settings.REDIS_CONN

    tasks = redis_storage.keys()
    for key in tasks:
        with suppress(
                Order.DoesNotExist, RegistrationOrder.DoesNotExist, Manager.DoesNotExist,
                ValidationError, ValueError, AttributeError, ResponseError
            ):
            notification_type = redis_storage.hmget(key, 'notification_type')[0].decode()
            obj_id            = redis_storage.hmget(key, 'id')[0].decode()
            url               = redis_storage.hmget(key, 'url')[0].decode()
            subject           = redis_storage.hmget(key, 'subject')[0].decode()
            message           = redis_storage.hmget(key, 'message')[0].decode()
            template          = redis_storage.hmget(key, 'form')[0].decode()

            if not template:
                raise ValidationError('Не указан шаблон письма', code='')

            email, context = get_context(notification_type, obj_id, url)
            recipient_list = get_recipient_list(notification_type, email)

            send_email(context, recipient_list, subject=subject, message=message, template=template)

        redis_storage.delete(key)


def get_recipient_list(notification_type, email):
    notifications = Notification.objects.filter(use_up=True, notification_type=notification_type)
    return [email] + [item.email for item in notifications if item.email]


def get_context(notification_type, id, url=''):
    result = {}
    if notification_type == 'confirm_order':
        obj = Order.objects.get(id=id)
        manager_talant = obj.client.registration_order.manager_talant
        if not manager_talant:
            raise ValidationError('Не указан менеджер talant', code='')
        email = manager_talant.email
        if not email:
            raise ValidationError('Не указан email менеджера talant', code='')
        
        result = email, {
            'id'        : obj.id,
            'created_at': obj.created_at,
            'client'    : obj.client,
            'manager'   : manager_talant.username
        } | get_images(['logo.png', 'confirm.jpg'])

    if notification_type == 'confirm_registration':
        obj = RegistrationOrder.objects.get(id=id)
        parsed_manager_name = parse_of_name(obj.name_of_manager)
        if not parsed_manager_name:
            raise ValidationError('Не указано ФИО персонального менеджера', code='')
        personal_manager = Manager.objects.get(
            last_name = parsed_manager_name['last_name'],
            first_name = parsed_manager_name['first_name']
        )
        email = obj.email
        if not email:
            raise ValidationError('Не указан email менеджера клиента', code='')
        result = email, {
            'url'     : url,
            'login'   : personal_manager.login,
            'password': personal_manager.password
        } | get_images(['logo.png', 'confirm.jpg'])
    
    return result


def get_images(images):
    result = {}
    static_dir = os.path.join(settings.BASE_DIR, 'static')
    for img_name in images:
        image_path = os.path.join(static_dir, 'img', img_name)
        with open(image_path, 'rb') as image_file:
            image_data = image_file.read()
        base64_image = base64.b64encode(image_data).decode()
        result[img_name.split('.')[0]] = base64_image
    return result


def send_email(context, recipient_list, **params):
    html_content = render_to_string(params['template'], context)
    send_mail(
        params['subject'],
        params['message'],
        settings.EMAIL_HOST_USER,
        recipient_list,
        html_message=html_content
    )
