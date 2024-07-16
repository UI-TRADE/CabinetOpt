import datetime

from functools import wraps
from contextlib import suppress

from django.conf import settings
from django.core.mail import EmailMessage

from django.template import Template, Context
from django.template.loader import render_to_string

from django_rq import job, get_queue

from django.core.exceptions import ValidationError
from redis.exceptions import ResponseError

from settings_and_conditions.models import NotificationType, Notification
from settings_and_conditions.notify_rollbar import notify_rollbar
from .models import OutgoingMail, MailingOfLetters
from clients.models import RegistrationOrder, Client, Manager
from orders.models import Order

MAX_NUM_OF_EMAIL_ADDRESSES_SENT = 5
DEFAULT_TIMEOUT_FOR_SENDING_EMAILS = 5

def launch_mailing():
    def wrap(func):
        @wraps(func)
        def run_func(*args):
            mail_params, = args
            unset_mail = func(mail_params)
            mail_params = {key: value for key, value in mail_params.items() if key != 'recipient_list'} | {
                'subject': unset_mail.subject,
                'obj_id': unset_mail.id
            }
            email_addresses = unset_mail.email.split(';')
            grouped_email_addresses = [
                email_addresses[i:i + MAX_NUM_OF_EMAIL_ADDRESSES_SENT]\
                    for i in range(
                        0, len(email_addresses), MAX_NUM_OF_EMAIL_ADDRESSES_SENT
            )]
            for i, emails in enumerate(grouped_email_addresses):
                current_queue = get_queue()
                current_queue.enqueue_in(
                    datetime.timedelta(minutes=DEFAULT_TIMEOUT_FOR_SENDING_EMAILS+i),
                    send_email, unset_mail.html_content, emails, **mail_params
                )
            return unset_mail

        return run_func
    return wrap


def get_email_addresses(clients):
    email_addresses = Manager.objects.all().prefetch_related('clients_by_managers').\
        filter(clients_by_managers__id__in=clients).\
        values_list('email', flat=True)
    
    if email_addresses:
        return [email_addresse for email_addresse in email_addresses]


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
        
        email = params.get('email')
        if email:
            with suppress(Manager.DoesNotExist):
                manager = client.manager.get(email=email)
            
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

    if notification_type == NotificationType.NEW_MANAGER:
        result = params['email'], params

    return result


def get_mail_params(notification_options):
    '''
        Return dict of mail parametrs.

        notification_options - dict with next keys:
            notification_type - (str) type of notification
            id - (str) object id
            url - (str) url
            params - (str) json dumps of object
    '''
    notification_types = NotificationType.objects.filter(event=notification_options['notification_type'])
    for obj in notification_types:
        subject  = obj.subject
        letter_content = obj.notification
        letter_template = obj.template
        with suppress(
            Order.DoesNotExist,
            Client.DoesNotExist,
            RegistrationOrder.DoesNotExist,
            Manager.DoesNotExist,
            NotificationType.DoesNotExist,
            ValidationError,
            ValueError,
            AttributeError,
            ResponseError
        ):
            with notify_rollbar():
                if not letter_content:
                    raise ValidationError('Не указано содержание письма', code='')
                email, context = get_context(**notification_options)
                recipient_list = get_recipient_list(obj, email)
                return {
                    'context': context,
                    'recipient_list': recipient_list,
                    'subject': subject,
                    'template': letter_template,
                    'content':letter_content
                }


@launch_mailing()
def create_outgoing_mail(mail_params):
    if not mail_params:
        return
    letter_content = mail_params['content']
    template = Template(letter_content)
    rendered_html = template.render(Context(mail_params['context']))
    html_content = render_to_string('forms/notify-template.html', {'params': rendered_html})
    if mail_params.get('template'):
        letter_template = mail_params.get('template')
        html_content = html_content.replace('<header></header>', letter_template.header_template)
        html_content = html_content.replace('<footer></footer>', letter_template.footer_template)
    return OutgoingMail.objects.create(
        email=';'.join(mail_params['recipient_list']),
        subject=mail_params['subject'],
        html_content=html_content
    )


@job('default')
def send_email(html_content, recipient_list, **params):
    for recipient in recipient_list:
        with notify_rollbar(extra_data={'recipient': recipient}):
            email = EmailMessage(
                params['subject'],
                html_content,
                f'TALANT<{settings.EMAIL_HOST_USER}>',
                [recipient],
                reply_to=['TALANT<opt@talantgold.ru>'],
            )
            email.content_subtype = "html"
            email.send()

    if params.get('obj_id'):
        OutgoingMail.objects.filter(id=params['obj_id']).update(
            sent_date=datetime.datetime.now()
        )

    if params.get('mailing_of_letter'):
        mailing_of_letter = params.get('mailing_of_letter')
        mailing_of_letter.status = MailingOfLetters.COMPLETED
        mailing_of_letter.save(update_fields=['status'])

