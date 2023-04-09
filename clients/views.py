from django import forms
from django.views import View
from django.shortcuts import render, redirect
from django.http import HttpResponse, JsonResponse
from django.core.exceptions import ValidationError

from clients.models import RegistrationOrder, Client


class RegForm(forms.ModelForm):
    inn = forms.CharField(validators = [])

    class Meta:
        model = RegistrationOrder
        fields = ('name', 'inn', 'name_of_manager', 'email', 'phone', 'priority_direction')

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        for field in self.fields:
            self.fields[field].widget.attrs['class'] = 'form-control'

    def clean_inn(self):
        value = self.cleaned_data['inn']
        if RegistrationOrder.objects.filter(inn=value).exists():
            raise ValidationError('Заявка на регистрацию с таким ИНН уже существует')
        return value


class LoginForm(forms.Form):
    login = forms.CharField(
        widget=forms.TextInput(
            attrs={'class': 'form-control', 'placeholder': 'ИНН / email'}
        )
    )
    password = forms.CharField(
        widget=forms.PasswordInput(
            attrs={'class': 'form-control', 'placeholder': 'Пароль'}
        )
    )
    fields = ['login', 'password']


class LoginFormView(View):

    def get(self, request):
        form = LoginForm()
        return render(request, 'client_login.html', {'form': form})
 
    def post(self, request):        
        form = LoginForm(request.POST)
        if not form.is_valid():
            return JsonResponse({'errors': form.errors.as_json()})
        
    
        # if not user:        
        #     return JsonResponse({
        #         'errors': json.dumps({'password': [
        #             {'message': 'Пользователь с введенными учетными данными не найден', 'code': ''}
        #         ],})
        #     })
        
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