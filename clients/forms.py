from django import forms

from clients.models import RegistrationOrder


class CustomRegOrderForm(forms.ModelForm):
    login    = forms.CharField(
        error_messages={
            'required': 'укажите логин мненеджера'
    })
    password = forms.CharField(
        widget=forms.PasswordInput(),
        error_messages={
            'required': 'введите пароль менеджера'
    })

    class Meta:
        model = RegistrationOrder
        fields = '__all__'
