from django import forms
from django.core.exceptions import ObjectDoesNotExist, ValidationError
from contextlib import suppress
from clients.models import RegistrationOrder, Manager

from .utils import parse_of_name


class CustomRegOrderForm(forms.ModelForm):
    login    = forms.CharField(
        required=False
        # error_messages={
        #     'required': 'укажите логин мненеджера'
    # }
    )
    password = forms.CharField(
        widget=forms.PasswordInput(),
        required=False
        # error_messages={
        #     'required': 'введите пароль менеджера'
    # }
    )

    class Meta:
        model = RegistrationOrder
        fields = '__all__'

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # self.fields['login'].initial = ''

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
