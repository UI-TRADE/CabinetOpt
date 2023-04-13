from contextlib import suppress
from django.views import View
from django.template import loader
from django.shortcuts import render, redirect
from django.http import HttpResponse, JsonResponse, HttpResponseRedirect
from django.core import serializers
from django.core.exceptions import ValidationError, ObjectDoesNotExist

from .models import (
    RegistrationOrder,
    ContactDetail,
    Client,
    # Manager,
)
from .forms import (
    RegForm,
    LoginForm,
    ContactDetailForm,
    # ManagersForm,
)


class LoginFormView(View):

    def get(self, request):
        form = LoginForm()
        if request.session.has_key('login'):
            del request.session['login']
        return render(request, 'client_login.html', {'form': form})
 
    def post(self, request):      
        form = LoginForm(request.POST)
        if not form.is_valid():
            return JsonResponse({'errors': form.errors.as_json()})

        request.session['login'] = form.cleaned_data['login']
        return redirect("start_page")
        


class ContactDetailView(View):

    def get(self, request):
        if request.session.has_key('login'):
                contact_details = list(
                    ContactDetail.objects.filter(
                        client__inn=request.session['login']
                    ).values()
                )
                if contact_details:   
                    return render(
                        request,
                        'contact.html',
                        {
                            'data': contact_details[0],
                            'id': contact_details[0]['client_id']
                    })
    
        return render(request, 'contact.html', {'data': {}})
    

class ContactDetailEditView(View):

    def get(self, request, id=None):
        form = ContactDetailForm()

        with suppress(ObjectDoesNotExist):
            obj = ContactDetail.objects.get(pk=id)
            form = ContactDetailForm(instance=obj)
            return render(request, 'pages/contact.html', {'form': form, 'id': obj.pk})
        
        return render(request, 'pages/contact.html', {'form': form})

 
    def post(self, request, id=None): 
        form = ContactDetailForm(request.POST)
        if not form.is_valid():
            return JsonResponse({'errors': form.errors.as_json()})
        if id:
            ContactDetail.objects.update_or_create(
                pk=id, defaults=form.cleaned_data,
            )
        else:
            client = Client.objects.filter(inn=request.session['login']).get()
            print(client)
            ContactDetail.objects.create(client=client, **form.cleaned_data)    

        return redirect("start_page")


def register(request):
    if request.method != 'POST':
        form = RegForm()
        return render(request, 'reg_order.html', {'form': form})

    form = RegForm(request.POST)
    if not form.is_valid():
        print(form.errors.as_json())
        return JsonResponse({'errors': form.errors.as_json()})
        
    RegistrationOrder.objects.get_or_create(
        inn=form.cleaned_data['inn'], defaults=form.cleaned_data,
    )

    return redirect("start_page")


def logout(request):
    if request.session.has_key('login'):
        del request.session['login']
    return redirect("start_page")
