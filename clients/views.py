import pdb
from contextlib import suppress
from django.views import View
from django.template import loader
from django.shortcuts import render, redirect
from django.http import HttpResponse, JsonResponse, HttpResponseRedirect
from django.core import serializers
from django.core.exceptions import ValidationError, ObjectDoesNotExist

from clients.models import RegistrationOrder, ContactDetail
from clients.forms import RegForm, LoginForm, ContactDetailForm


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

    def get(self, request, id=None):
        form = ContactDetailForm()

        if id:
            obj = ContactDetail.objects.get(pk=id)
            form = ContactDetailForm(instance=obj)
            return render(request, 'pages/contact.html', {'form': form, 'id': obj.pk})

        if request.session.has_key('login'):
            with suppress(ObjectDoesNotExist):
                contact_details = list(
                    ContactDetail.objects.filter(
                        client__inn=request.session['login']
                    ).values()
                )
                if not contact_details:
                    return render(request, 'contact.html', {'data': {}})
    
        return render(
            request,
            'contact.html',
            {
                'data': contact_details[0],
                'id': contact_details[0]['client_id']
        })
 
    def post(self, request):      
        form = ContactDetailForm(request.POST)
        if not form.is_valid():
            return JsonResponse({'errors': form.errors.as_json()})
      
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
