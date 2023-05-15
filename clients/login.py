import pdb
import re
from contextlib import suppress
from django.conf import settings

from clients.models import Manager, Client


class Login(object):

    def __init__(self, request):
        self.session = request.session
        session_login = self.session.get(settings.SESSION_LOGIN)
        if not session_login:
            session_login = self.session[settings.SESSION_LOGIN] = {}
        self.login = session_login

    def auth(self, login='', password=''):
        def is_email(email):
            regex = re.compile(
                r'([A-Za-z0-9]+[.-_])*[A-Za-z0-9]+@[A-Za-z0-9-]+(\.[A-Z|a-z]{2,})+'
            )
            return re.fullmatch(regex, email)
        
        if is_email(login):
            with suppress(Manager.DoesNotExist):
                manager = Manager.objects.get(email=login)
                if manager.password == password:
                    self.login['login'] = login
                    self.login['manager'] = manager.id

        with suppress(Client.DoesNotExist):
            client = Client.objects.get(inn=login)
            self.login['login'] = login
            self.login['client'] = client.id

    def unauth(self):
        del self.session[settings.SESSION_LOGIN]
        self.session.modified = True

    def get_clients(self):
        client_id = self.login.get('client')
        if client_id:
            return Client.objects.filter(pk=client_id)
        
        manager_id = self.login.get('manager')
        if manager_id:
            return Client.objects.filter(manager__pk=manager_id)


    def get_managers(self):
        manager_id = self.login.get('manager')
        if manager_id:
            return Manager.objects.filter(pk=manager_id)
        
        client_id = self.login.get('client')
        if client_id:
            return Manager.objects.filter(
                pk__in=Client.manager.through.objects.filter(
                    client_id=client_id
                ).values_list('manager_id', flat=True)
            )
