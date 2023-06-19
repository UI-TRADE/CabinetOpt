from django.views import View
from django.db import transaction
from django.http import JsonResponse
from django.shortcuts import (
    render, redirect, get_object_or_404
)
from django.urls import reverse_lazy
from django.views.generic import ListView, UpdateView, CreateView

from .login import Login

from .forms import (
    RegForm,
    LoginForm,
    ContactDetailForm,
    ManagerForm
)
from .models import (
    Client,
    RegistrationOrder,
    ContactDetail,
    Manager,
)


class LoginFormView(View):

    def get(self, request):
        form = LoginForm()
        return render(request, 'forms/client_login.html', {'form': form})
 
    def post(self, request):
        login = Login(request)
        form = LoginForm(request.POST)
        if not form.is_valid():
            return JsonResponse({'errors': form.errors.as_json()})

        login.auth(**form.cleaned_data)
        return redirect("start_page")


def register(request):

    if request.method != 'POST':
        form = RegForm()
        return render(request, 'forms/reg_order.html', {'form': form})

    form = RegForm(request.POST)
    if not form.is_valid():
        return JsonResponse({'errors': form.errors.as_json()})
        
    RegistrationOrder.objects.get_or_create(
        inn=form.cleaned_data['inn'], defaults=form.cleaned_data,
    )

    return redirect("start_page")


def logout(request):
    login = Login(request)
    login.unauth()
    return redirect("start_page")


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
            return {
                'client': Client.objects.filter(
                    pk=contact_detail.client_id
                ).first(),
                'manager': Manager.objects.filter(
                    pk__in=Client.manager.through.objects.filter(
                        client_id=contact_detail.client_id
                    ).values_list('manager_id', flat=True)
                ).first(),
                'contact': contact_detail,
            }
        return {'contact': {}}


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
                last_name = form.cleaned_data['last_name'],
                first_name = form.cleaned_data['first_name'],
                defaults = form.cleaned_data
            )
            client.manager.add(personal_manager)
        return redirect('clients:manager')
