import pdb
from contextlib import suppress
from django.views import View
from django.db import transaction
from django.views.generic import ListView, UpdateView, CreateView
from django.shortcuts import render, redirect, get_object_or_404
from django.urls import reverse_lazy
from django.http import JsonResponse, HttpResponseRedirect
from django.core.exceptions import ValidationError, ObjectDoesNotExist

from .models import (
    RegistrationOrder,
    ContactDetail,
    Client,
    Manager,
)
from .forms import (
    RegForm,
    LoginForm,
    ContactDetailForm,
    ManagerForm
)


class LoginFormView(View):

    def get(self, request):
        form = LoginForm()
        if request.session.has_key('login'):
            del request.session['login']
        return render(request, 'forms/client_login.html', {'form': form})
 
    def post(self, request):      
        form = LoginForm(request.POST)
        if not form.is_valid():
            return JsonResponse({'errors': form.errors.as_json()})

        request.session['login'] = form.cleaned_data['login']
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
    if request.session.has_key('login'):
        del request.session['login']
    return redirect("start_page")


class ContactDetailView(ListView):
    model = ContactDetail
    template_name = 'pages/contact.html'
    allow_empty = True

    def get_queryset(self):
        return self.model.objects.filter(
            client__inn=self.request.session['login']
        )

    def get_context_data(self, *, object_list=None, **kwargs):
        context = super().get_context_data(**kwargs)
        contact_details = list(context['object_list'].values())
        if not contact_details:
            return {'data': {}}
        return {
            'data': contact_details[0],
            'id': contact_details[0]['client_id']
        }


class ContactDetailCreateView(CreateView):
    form_class = ContactDetailForm
    template_name = 'forms/contact.html'
    success_url = reverse_lazy('contact')

    def form_valid(self, form):
        with transaction.atomic():
            client = Client.objects.filter(inn=self.request.session['login']).get()
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
        return Client.objects.get(
            inn=self.request.session['login']
        ).manager.all()

    def get_context_data(self, *, object_list=None, **kwargs):
        context = super().get_context_data(**kwargs)
        return dict(list(context.items()))
    

class ManagerAddView(CreateView):
    form_class = ManagerForm
    template_name = 'forms/manager.html'
    success_url = reverse_lazy('manager')

    def form_valid(self, form):
        with transaction.atomic():
            client = Client.objects.filter(inn=self.request.session['login']).get()
            personal_manager, _ = Manager.objects.get_or_create(
                last_name = form.cleaned_data['last_name'],
                first_name = form.cleaned_data['first_name'],
                defaults = form.cleaned_data
            )
            client.manager.add(personal_manager)
        return redirect('clients:manager')
