from django import template
from django.conf import settings
from contextlib import suppress

from clients.models import Client, Manager

register = template.Library()

@register.filter
def login_info(session):
    login_name = ''
    session_login = session.get(settings.SESSION_LOGIN)
    if not session_login:
        return ''
    manager_id = session_login.get('manager')
    client_id = session_login.get('client')
    with suppress(Manager.DoesNotExist, Client.DoesNotExist):
        if manager_id:
            login_name = str(Manager.objects.get(pk=manager_id))  
        if client_id:
            login_name = str(Client.objects.get(pk=client_id))
        
    return login_name
