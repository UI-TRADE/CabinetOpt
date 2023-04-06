from django import forms
from django.shortcuts import render, redirect
from django.http import HttpResponse, JsonResponse
from django.core.exceptions import ValidationError

from clients.models import RegistrationOrder


class RegForm(forms.ModelForm):
    inn = forms.CharField(validators = [])

    class Meta:
        model = RegistrationOrder
        fields = ('name', 'inn', 'manager', 'email', 'phone', 'priority_direction')

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        for field in self.fields:
            self.fields[field].widget.attrs['class'] = 'form-control'

    def clean_inn(self):
        value = self.cleaned_data['inn']
        if RegistrationOrder.objects.filter(inn=value).exists():
            raise ValidationError('Заявка на регистрацию с таким ИНН уже существует')
        return value


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
