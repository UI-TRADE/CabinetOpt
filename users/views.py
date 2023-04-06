import json

from django import forms
from django.shortcuts import render, redirect
from django.views import View
from django.http import HttpResponse, JsonResponse
from django.contrib.auth import authenticate

from users.models import CustomUser


class LoginForm(forms.Form):
    username = forms.CharField(
        widget=forms.TextInput(
            attrs={'class': 'form-control', 'placeholder': 'Логин'}
        )
    )
    password = forms.CharField(
        widget=forms.PasswordInput(
            attrs={'class': 'form-control', 'placeholder': 'Пароль'}
        )
    )
    fields = ['username', 'password']


class LoginFormView(View):

    def get(self, request):
        form = LoginForm()
        return render(request, 'login.html', {'form': form})
 
    def post(self, request):        
        form = LoginForm(request.POST)
        if not form.is_valid():
            return JsonResponse({'errors': form.errors.as_json()})
        
        user = authenticate(
            username=form.cleaned_data['username'],
            password=form.cleaned_data['password']
        ) 

        if not user:        
            return JsonResponse({
                'errors': json.dumps({'password': [
                    {'message': 'Пользователь с введенными учетными данными не найден', 'code': ''}
                ],})
            })
        
        return redirect("start_page")
