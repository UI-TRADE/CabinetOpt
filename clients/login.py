import re
from django.conf import settings
from contextlib import suppress

from clients.models import Manager, Client, AuthorizationAttempt


class AuthenticationError(Exception):
    def __str__(self):
        return 'Неверный логин или пароль'


class Login(object):

    def __init__(self, request):
        self.session = request.session
        session_login = self.session.get(settings.SESSION_LOGIN)
        if not session_login:
            session_login = self.session[settings.SESSION_LOGIN] = {}
        self.login = session_login
        self.x_client_id = request.META.get('HTTP_X_CLIENT_ID')


    def _add_failed_attempt(func):
        def wrapper(*args, **kwargs):
            self = args[0]
            try:
                func(*args, **kwargs)
            except AuthenticationError:
                if self.x_client_id:
                    obj, _ = AuthorizationAttempt.objects.get_or_create(client_id=self.x_client_id)
                    obj.attempts = min(obj.attempts + 1, settings.MAX_FAILED_LOGIN_ATTEMPTS)
                    obj.save()
                raise
            else:
                AuthorizationAttempt.objects.filter(client_id=self.x_client_id).delete()
        return wrapper


    def is_email(self, email):
        regex = re.compile(
            r'([A-Za-z0-9]+[.-_])*[A-Za-z0-9]+@[A-Za-z0-9-]+(\.[A-Z|a-z]{2,})+'
        )
        return re.fullmatch(regex, email)


    @_add_failed_attempt
    def auth(self, login='', password=''):
        if not login:
            raise AuthenticationError('Не заполнен логин')

        try:
            if self.is_email(login):
                obj = Manager.objects.get(email=login)
                if obj.password != password:
                    raise AuthenticationError
                self.login['manager'] = obj.id
            else:
                obj = Client.objects.get(inn=login)
                manager = obj.manager.first()
                if manager.password != password:
                    raise AuthenticationError
                self.login['client'] = obj.id

            self.login['login'] = login
        except (Manager.DoesNotExist, Client.DoesNotExist, IndexError):
            raise AuthenticationError


    @_add_failed_attempt
    def cahnge_pass_and_auth(self, login='', password='', new_password=''):
        try:
            if self.is_email(login):
                obj = Manager.objects.get(email=login)
                if obj.password != password:
                    raise AuthenticationError
                self.login['manager'] = obj.id
            else:
                obj = Client.objects.get(inn=login)
                obj.manager.all().update(password=new_password)
                self.login['client'] = obj.id

            self.login['login'] = login
        except (Manager.DoesNotExist, Client.DoesNotExist):
            raise AuthenticationError


    @_add_failed_attempt
    def set_pass_and_auth(self, login='', new_password=''):
        try:
            if self.is_email(login):
                obj = Manager.objects.get(email=login).update(password=new_password)
                self.login['manager'] = obj.id
            else:
                obj = Client.objects.get(inn=login)
                obj.manager.all().update(password=new_password)
                self.login['client'] = obj.id

            self.login['login'] = login
        except (Manager.DoesNotExist, Client.DoesNotExist):
            raise AuthenticationError


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


class RawLogin(Login):

    def __init__(self, request):
        super().__init__(request)
        if request.method == 'POST':
            self.raw_login = request.POST.get('login')


    def is_login_exist(self):
        if not self.raw_login:
            return False
        
        with suppress(Manager.DoesNotExist, Client.DoesNotExist):
            if self.is_email(self.raw_login):
                Manager.objects.get(email=self.raw_login)
            else:
                Client.objects.get(inn=self.raw_login)
            return True
    
        return False
    

    def check_password(self, password):
        if self.raw_login and password:
            with suppress(
                AuthenticationError, Manager.DoesNotExist,
                Client.DoesNotExist, IndexError
            ):
                if self.is_email(self.raw_login):
                    obj = Manager.objects.get(email=self.raw_login)
                    if obj.password != password:
                        raise AuthenticationError
                else:
                    obj = Client.objects.get(inn=self.raw_login)
                    manager = obj.manager.first()
                    if manager.password != password:
                        raise AuthenticationError
                return True
        return False


    def get_clients(self):
        if self.raw_login:
            with suppress(Manager.DoesNotExist, Client.DoesNotExist):
                if self.is_email(self.raw_login):
                    manager = Manager.objects.get(email=self.raw_login)
                    clients = Client.objects.filter(manager__pk=manager.id)

                else:
                    clients = Client.objects.filter(inn=self.raw_login)
                
                return clients
        
        return Client.objects.filter(pk=-1)

