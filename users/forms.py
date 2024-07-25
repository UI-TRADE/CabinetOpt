from django import forms
from django.contrib.auth.models import User
from django.contrib.auth.hashers import make_password

from .models import CustomUser


class UserPasswordChangeForm(forms.ModelForm):
    password_field = forms.CharField(widget=forms.PasswordInput(render_value=True), required=False)

    class Meta:
        model = CustomUser
        fields = ['username', 'password_field', 'name', 'email', 'phone', 'gender', 'date_of_birth', 'groups', 'is_staff']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['password_field'].initial = '********'
