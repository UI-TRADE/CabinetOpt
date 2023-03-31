import pdb

from django import forms
from django.shortcuts import render, redirect
from django.views import View
from django.http import HttpResponse

from clients.models import RegistrationOrder


class RegForm(forms.ModelForm):
    class Meta:
        model = RegistrationOrder
        fields = ('name', 'inn', 'manager', 'email', 'phone', 'priority_direction')


class RegFormView(View):
    def get(self, request, *args, **kwargs):
        form = RegForm()
        return render(request, "reg_form.html", context={
            'form': form
        })

    def post(self, request):
        form = RegForm(request.POST)

        if not form.is_valid():
            print(form.errors)
            return render(request, "reg_form.html", context={
                'form': form
            })
        
        return redirect("start_page")

