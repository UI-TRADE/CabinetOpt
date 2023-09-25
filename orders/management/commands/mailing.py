import os
import base64
import schedule
import time

from contextlib import suppress
from django.conf import settings
from django.core.mail import send_mail
from django.core.management import BaseCommand
from django.template.loader import render_to_string

from orders.models import Order


class Command(BaseCommand):
    def handle(self, *args, **options):
        while True:
            try:
                schedule.every(1).minutes.do(launch_mailing)
                while True:
                    time.sleep(10)
                    schedule.run_pending()
                    if not schedule.jobs:
                        break
            except Exception:
                continue


def launch_mailing():
    redis_storage = settings.REDIS_CONN

    order_ids = redis_storage.keys()
    print(order_ids)
    for order_id in order_ids:
        with suppress(Order.DoesNotExist, ValueError):
            order = Order.objects.get(pk=order_id.decode())
            manager_talant = order.client.registration_order.manager_talant
            if not manager_talant:
                redis_storage.delete(order_id)
                raise Order.DoesNotExist
            email = manager_talant.email
            if not email:
                redis_storage.delete(order_id)
                raise ValueError
            
            context = {
                'id'        : order.id,
                'created_at': order.created_at,
                'client'    : order.client,
                'manager'   : manager_talant.username
            } | get_images(['logo.png', 'confirm.jpg'])

            recipient_list = [
                email,
                'Chikunova.Anastasiya@talant-gold.ru',
            ]

            send_email(context, recipient_list)
            redis_storage.delete(order_id)
               
        continue


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


def send_email(context, recipient_list):
    html_content = render_to_string('forms/approve.html', context)
    subject = 'отправка заказа менеджеру talant'
    from_email = settings.EMAIL_HOST_USER
    message = 'отправка заказа менеджеру talant'
    send_mail(subject, message, from_email, recipient_list, html_message=html_content)
