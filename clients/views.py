import hashlib
import secrets
import uuid

from django.db import transaction
from django.http import JsonResponse
from django.shortcuts import (
    render, redirect, get_object_or_404
)
from django.urls import reverse_lazy, reverse
from django.views.generic import ListView, UpdateView, CreateView
from django.conf import settings
from contextlib import suppress

from rest_framework.decorators import api_view

from .login import Login
from .forms import (
    RegForm,
    LoginForm,
    LoginFormRecovery,
    ChangePassForm,
    RecoveryPassForm,
    ContactDetailForm,
    ManagerForm
)
from .models import (
    Client,
    RegistrationOrder,
    ContactDetail,
    Manager,
    AuthorizationAttempt,
)
from orders.models import Order
from settings_and_conditions.models import NotificationType
from settings_and_conditions.utils import notification_scheduling


def login(request):
    x_client_id = request.META.get('HTTP_X_CLIENT_ID')
    if request.method != 'POST':
        template = 'forms/auth.html'
        form = LoginForm()
        with suppress(AuthorizationAttempt.DoesNotExist):
            obj = AuthorizationAttempt.objects.get(client_id=x_client_id)
            if obj.attempts == settings.MAX_FAILED_LOGIN_ATTEMPTS:
                template = 'forms/auth-recovery.html'
                form = LoginFormRecovery()

        return render(request, template, {'form': form})

    with suppress(AuthorizationAttempt.DoesNotExist):
        obj = AuthorizationAttempt.objects.get(client_id=x_client_id)
        if obj.attempts == settings.MAX_FAILED_LOGIN_ATTEMPTS:
            form = LoginFormRecovery()
            return render(request, 'forms/auth-recovery.html', {'form': form})
    
    form = LoginForm(request)
    if not form.is_valid():
        return JsonResponse({'errors': form.errors.as_json()})
    
    return JsonResponse({'redirect_url': reverse('catalog:products')})


@notification_scheduling(NotificationType.REG_REQUEST)
def create_registration_order(cleaned_data):
    return RegistrationOrder.objects.get_or_create(
        identification_number=cleaned_data['identification_number'],
        defaults={key: value for key, value in cleaned_data.items() if key != 'captcha'}\
            |{'name_of_manager': cleaned_data['name']},
    )


def register(request):
    if request.method != 'POST':
        form = RegForm()
        return render(request, 'forms/sign-in.html', {'form': form})

    form = RegForm(request.POST)
    if not form.is_valid():
        return JsonResponse({'errors': form.errors.as_json()})
   
    create_registration_order(form.cleaned_data)
    return render(request, 'forms/confirm-registration.html', {})


def register_confirm(request):
    return redirect("start_page")


def logout(request):
    login = Login(request)
    login.unauth()
    return redirect("start_page")


def change_password(request, id):
    if request.method != 'POST':
        login = Login(request)
        login.unauth()

        hash_login = request.GET.get('usr')
        if hash_login:
            inn, hash_inn = '', ''
            registration_orders = RegistrationOrder.objects.all()
            for registration_order in registration_orders:
                hash_inn = hashlib.sha256(registration_order.identification_number.encode()).hexdigest()
                if secrets.compare_digest(hash_login, hash_inn):
                    inn = registration_order.identification_number
                    break
            if inn:
                form = ChangePassForm(initial={'login': inn})
                return render(
                    request,
                    'pages/change-pass.html',
                    {'form': form, 'hash_inn': hash_inn, 'errors': ''}
                )
    
        return redirect("start_page")
    
    form = ChangePassForm(request)
    if not form.is_valid():
        return JsonResponse({'errors': form.errors.as_json()})

    return JsonResponse({'redirect_url': reverse('catalog:products')})


@notification_scheduling(NotificationType.RECOVERY_PASS)
def do_recovery_password(request, form):
    pass


def request_password(request):
    if request.method != 'POST':
        return redirect("start_page")
    
    form = LoginFormRecovery(request.POST)
    if not form.is_valid():
        return JsonResponse({'errors': form.errors.as_json()})

    do_recovery_password(request, form)
    return render(request, 'forms/confirm-recovery.html', {})


def recovery_password(request, id):
    if request.method != 'POST':
        login = Login(request)
        login.unauth()

        hash_login = request.GET.get('usr')
        if hash_login:
            inn, hash_inn = '', ''
            registration_orders = RegistrationOrder.objects.all()
            for registration_order in registration_orders:
                hash_inn = hashlib.sha256(registration_order.identification_number.encode()).hexdigest()
                if secrets.compare_digest(hash_login, hash_inn):
                    inn = registration_order.identification_number
                    break
            if inn:
                form = RecoveryPassForm(initial={'login': inn})
                return render(
                    request,
                    'pages/recovery-pass.html',
                    {'form': form, 'hash_inn': hash_inn, 'errors': ''}
                )
    
        return redirect("start_page")
    
    form = RecoveryPassForm(request)
    if not form.is_valid():
        return JsonResponse({'errors': form.errors.as_json()})
    
    return JsonResponse({'redirect_url': reverse('catalog:products')})


@api_view(['GET'])
def check_login(request):
    login = Login(request)
    if login.login:
        return JsonResponse({'replay': 'ok'}, status=200)
    return JsonResponse({'replay': 'fail'}, status=200)


class ContactDetailView(ListView):
    model = ContactDetail
    template_name = 'pages/contact.html'
    allow_empty = True

    def get_queryset(self):
        login = Login(self.request)
        current_clients = login.get_clients()
        if not current_clients:
            return super().get_queryset()
        return self.model.objects.filter(client__in=current_clients)

    def get_context_data(self, *, object_list=None, **kwargs):
        context = super().get_context_data(**kwargs)
        contact_detail = context['object_list'].first()
    
        if contact_detail:
            login = Login(self.request)
            client = Client.objects.filter(pk=contact_detail.client_id).first()
            orders = Order.objects.filter(client=client).order_by('-created_at')
            hash_id = hashlib.sha256(str(uuid.uuid4()).encode()).hexdigest()
            hash_inn = hashlib.sha256(client.inn.encode()).hexdigest()
            return {
                'client'  : client,
                'manager' : client.manager.first(),
                'contact' : contact_detail,
                'login'   : login.login,
                'orders'  : orders,
                'hash_id' : hash_id,
                'hash_inn': hash_inn,
            }
        return {'contact': {}, 'hash_inn': '',}


class ContactDetailCreateView(CreateView):
    form_class = ContactDetailForm
    template_name = 'forms/contact.html'
    success_url = reverse_lazy('contact')

    def form_valid(self, form):
        with transaction.atomic():
            login = Login(self.request)
            client = login.get_clients().get()
            ContactDetail.objects.create(client=client, **form.cleaned_data) 
        return redirect('clients:contact')
    

class ContactDetailEditView(UpdateView):
    form_class = ContactDetailForm
    template_name = 'forms/contact.html'
    success_url = reverse_lazy('contact')

    def get_object(self, queryset=None): 
        return get_object_or_404(ContactDetail, pk=self.kwargs['id'])

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['id'] = self.kwargs['id']
        return context

    def form_valid(self, form):
        ContactDetail.objects.update_or_create(
            pk=self.kwargs['id'], defaults=form.cleaned_data,
        )
        return redirect('clients:contact')


class ManagerView(ListView):
    model = Manager
    template_name = 'pages/manager.html'
    context_object_name = 'managers'
    allow_empty = True

    def get_queryset(self):
        login = Login(self.request)
        return login.get_managers()

    def get_context_data(self, *, object_list=None, **kwargs):
        context = super().get_context_data(**kwargs)
        return dict(list(context.items()))
    

class ManagerAddView(CreateView):
    form_class = ManagerForm
    template_name = 'forms/manager.html'
    success_url = reverse_lazy('manager')

    def form_valid(self, form):
        with transaction.atomic():
            login = Login(self.request)
            client = login.get_clients().get()
            personal_manager, _ = Manager.objects.get_or_create(
                name = form.cleaned_data['name'],
                defaults = form.cleaned_data
            )
            client.manager.add(personal_manager)
        return redirect('clients:manager')
