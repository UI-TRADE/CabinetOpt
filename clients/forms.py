from django import forms
from django.core.exceptions import ObjectDoesNotExist, ValidationError
from contextlib import suppress

from .utils import parse_of_name
from .models import (
    RegistrationOrder,
    Manager,
    ContactDetail
)


class CustomRegOrderForm(forms.ModelForm):
    login    = forms.CharField(required=False)
    password = forms.CharField(
        widget=forms.PasswordInput(),
        required=False
    )

    class Meta:
        model = RegistrationOrder
        fields = '__all__'

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

    def clean(self):
        super().clean() 

        registration_order = self.cleaned_data
        if not registration_order.get('status') or registration_order.get('status') != 'registered':
            return
        
        parsed_name = parse_of_name(registration_order.get('name_of_manager'))
        if not parsed_name:
            raise ValidationError('Не указано ФИО персонального менеджера', code='')

        with suppress(ObjectDoesNotExist):

            Manager.objects.get(
                **{key: value for key, value in parsed_name.items() if key != 'surname'}
            )
            return
                   
        if not self.cleaned_data.get('login'):
            self.add_error('login', 'Не указан логин персонального менеджера')
        
        if not self.cleaned_data.get('password'):
            self.add_error('password', 'Не указан пароль персонального менеджера')


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


class ContactDetailForm(forms.ModelForm):
    
    class Meta:
        model = ContactDetail
        fields = ['city', 'legal_address', 'shoping_address', 'payment_type']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        for field in self.fields:
            self.fields[field].widget.attrs['class'] = 'form-control'


# class ManagersForm(forms.ModelForm):
    
#     class Meta:
#         model = Manager
#         fields = ['last_name', 'first_name', 'surname', 'email', 'phone']

#     def __init__(self, *args, **kwargs):
#         super().__init__(*args, **kwargs)
