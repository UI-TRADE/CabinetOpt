import pdb

from django.contrib import admin
from django.db import transaction
from django.core.exceptions import ValidationError

from .models import (
    PriorityDirection,
    RegistrationOrder,
    Client,
    Manager,
    ContactDetail
)
from .forms import CustomRegOrderForm


class ManagerInLine(admin.TabularInline):
    model = Client.manager.through
    extra = 0
    verbose_name = "Персональный менеджер"
    verbose_name_plural = "Персональные менеджеры"


@admin.register(PriorityDirection)
class PriorityDirectionAdmin(admin.ModelAdmin):
    search_fields = ['name',]
    list_display = ['name',]


@admin.register(RegistrationOrder)
class RegistrationOrderAdmin(admin.ModelAdmin):
    form = CustomRegOrderForm
    search_fields = [
        'name',
        'inn',
        'name_of_manager',
        'email',
        'phone',
        'status',
    ]
    list_display = [
        'name',
        'inn',
        'name_of_manager',
        'email',
        'phone',
        'status',
    ]
    fields = [
        'status',
        ('name', 'inn'),
        (
            'name_of_manager',
            'email',
            'phone',
        ),
        ('login', 'password'),
        'priority_direction',
    ]

    def get_readonly_fields(self, request, obj=None):
        return self.readonly_fields

    def get_fieldsets(self, request, obj=None):
        fieldsets = super().get_fieldsets(request, obj)
        print(fieldsets)
        # newfieldsets = list(fieldsets)
        # fields = ['foo', 'bar', 'baz']
        # newfieldsets.append(['Dynamic Fields', { 'fields': fields }])

        return fieldsets

    def get_form(self, request, obj=None, **kwargs):
        return super().get_form(request, obj, **kwargs)

    def save_model(self, request, obj, form, change):
        if not change:
            return
        print(form.is_valid())
        registration_order = form.cleaned_data

        if registration_order['status'] != 'registered':
            return super().save_model(request, obj, form, change)

        with transaction.atomic():
            manager = Manager.objects.create(
                **{key: value for key, value in registration_order.items()}
            )
            Client.objects.create(**{
                'name': registration_order['name'],
                'inn': registration_order['inn'],
                'registration_order': obj,
                'manager': manager,
                'approved_by': request.user,
            })
            return super().save_model(request, obj, form, change)



        


@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    search_fields = [
        'name',
        'inn',
        'registration_order',
        'approved_by',
        'updated_by',
    ]
    list_display = [
        f.name for f in Client._meta.get_fields() if not f.name in ['id', 'manager']
    ]
    fields = [
        ('name', 'inn'),
        'registration_order',
        ('created_at', 'approved_by'),
        ('updated_at', 'updated_by'),
    ]
    readonly_fields = [
        'created_at',
        'updated_at',
        'registration_order',
        'approved_by',
        'updated_by',
    ]
    inlines = [ManagerInLine]


@admin.register(ContactDetail)
class ContactDetailAdmin(admin.ModelAdmin):
    search_fields = [
        'client',
        'city',
        'legal_address',
        'shoping_address',
        'payment_type',
    ]
    list_display = [
        f.name for f in ContactDetail._meta.get_fields() if f.name != 'id'
    ]
    fields = [('client', 'city'), ('legal_address', 'shoping_address'), 'payment_type']
