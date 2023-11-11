from typing import Any
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

    class Meta:
        model = RegistrationOrder
        fields = ('name', 'organization', 'identification_number', 'phone', 'email')
        labels = {
            'name'                  : 'Ваше имя',
            'organization'          : 'Организация',
            'identification_number' : 'ИНН',
            'phone'                 : 'Номер телефона',
            'email'                 : 'e-mail',
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        for field in self.fields:
            self.fields[field].widget.attrs['class'] = 'form-control default-input reg-field-layout'

    def clean_identification_number(self):
        value = self.cleaned_data['identification_number']
        if not (len(value) == 10 or len(value) == 12):
            raise ValidationError('Неверное количество символов ИНН')
        if not self.inn_is_valid(value):
            raise ValidationError('Контрольное число ИНН не совпадает с расчитанным')  
        if RegistrationOrder.objects.filter(identification_number=value).exists():
            raise ValidationError('Заявка на регистрацию с таким ИНН уже существует')
        return value
    
    def inn_is_valid(self, target_inn):
        '''Проверяет валидность ИНН по контрольному числу
        Возвращает True в случае валидности и False в обратном случае'''

        length = len(target_inn)
        base = target_inn[:-1]
        
        if length == 10:
            factors_10 = [2, 4, 10, 3, 5, 9, 4, 6, 8, 0]
            sum_products = 0
            for digit in range(len(base)):
                sum_products += int(base[digit]) * factors_10[digit]
            result = (sum_products % 11) % 10
            if result > 9:
                key = result % 10
            else:
                key = result
            if key == int(target_inn[-1]):
                return True
            else:
                return False
                
        elif length == 12:
            factors_12_1 = [7, 2, 4, 10, 3, 5, 9, 4, 6, 8, 0]
            factors_12_2 = [3, 7, 2, 4, 10, 3, 5, 9, 4, 6, 8, 0]
            sum_products1 = 0
            for digit in range(len(base)):
                sum_products1 += int(base[digit]) * factors_12_1[digit]
            result1 = sum_products1 % 11
            if result1 > 9:
                key_1 = result1 % 10
            else:
                key_1 = result1
            sum_products2 = 0
            for digit in range(length):
                sum_products2 += int(target_inn[digit]) * factors_12_2[digit]
            result2 = sum_products2 % 11
            if result2 > 9:
                key_2 = result2 % 10
            else:
                key_2 = result2
            if key_1 == int(target_inn[10]) and key_2 == int(target_inn[11]):
                return True
            else:
                return False

        else:
            return False


class LoginForm(forms.Form):
    login = forms.CharField(
        label='ИНН',
        widget=forms.TextInput(
            attrs={'class': 'form-control default-input reg-field-layout', 'placeholder': 'ИНН'}
        )
    )
    password = forms.CharField(
        label='Пароль',
        widget=forms.PasswordInput(
            attrs={'class': 'form-control default-input reg-field-layout', 'placeholder': 'Пароль'}
        )
    )
    fields = ['login', 'password']


class ChangePassForm(forms.Form):
    login = forms.CharField(
        label='ИНН',
        widget=forms.TextInput(
            attrs={'class': 'form-control default-input reg-field-layout', 'placeholder': 'ИНН'}
        )
    )
    old_pass = forms.CharField(
        label='Старый пароль',
        widget=forms.PasswordInput(
            attrs={'class': 'form-control default-input reg-field-layout', 'placeholder': ''}
        )
    )
    new_pass = forms.CharField(
        label='Новый пароль',
        widget=forms.PasswordInput(
            attrs={'class': 'form-control default-input reg-field-layout', 'placeholder': ''}
        )
    )
    repeat_pass = forms.CharField(
        label='Повторите пароль еще раз',
        widget=forms.PasswordInput(
            attrs={'class': 'form-control default-input reg-field-layout', 'placeholder': ''}
        )
    )
    fields = ['login', 'old_pass', 'new_pass', 'repeat_pass']

    def clean_login(self):
        value = self.cleaned_data['login']  
        if not RegistrationOrder.objects.filter(identification_number=value).exists():
            raise ValidationError('Клиент с таким ИНН не существует')
        return value
    
    def clean_repeat_pass(self):
        new_pass = self.cleaned_data['new_pass']
        repeat_pass = self.cleaned_data['repeat_pass']
        if not new_pass == repeat_pass:
            raise ValidationError('Пароли не совпадают')
        return repeat_pass


class ContactDetailForm(forms.ModelForm):
    
    class Meta:
        model = ContactDetail
        fields = ['city', 'legal_address', 'shoping_address', 'payment_type']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        for field in self.fields:
            self.fields[field].widget.attrs['class'] = 'form-control'


class ManagerForm(forms.ModelForm):

    class Meta:
        model = Manager
        fields = ['last_name', 'first_name', 'surname', 'email', 'phone']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        for field in self.fields:
            self.fields[field].widget.attrs['class'] = 'form-control'

    def clean(self):
        '''Переопределяем стандартное описание ошибки, ибо оно на английском'''
        
        if not self.cleaned_data.get('phone'):
            self.errors['phone'][0] = 'Не верно указан телефон персонального менеджера (+12125552368)'

        return super().clean()
