
import os
import base64

from django.contrib import admin
from django.db import transaction
from django.urls import reverse
from django.core.mail import send_mail
from django.core.exceptions import ValidationError
from django.contrib.admin import SimpleListFilter
from django.template.loader import render_to_string
from django.conf import settings

from .models import (
    Organization,
    RegistrationOrder,
    Client,
    Manager,
    ContactDetail
)
from orders.models import Order
from .forms import CustomRegOrderForm
from .utils import parse_of_name


class OrderInLine(admin.TabularInline):
    model = Order
    extra = 0
    show_change_link = True
    fields = ('num_in_1C' ,'provision', 'status', 'manager')
    readonly_fields = ('num_in_1C' ,'provision', 'status', 'manager')
    classes = ('collapse', )
 
    verbose_name = "Заказ"
    verbose_name_plural = "Заказы"


class RegistrationOrderFilter(SimpleListFilter):
    title = 'Статусы заявок'
    parameter_name = 'status'

    def default_value(self):
        return 'not_registered'

    def lookups(self, request, model_admin):
        return (
            ('not_registered', 'Не зарегистрированные'),
            ('registered', 'Зарегистрированные'),
        )

    def queryset(self, request, queryset):
        if self.value() == 'not_registered':
            return queryset.filter(
                status__in=['pending', 'considered']
            )
        if self.value() == 'registered':
            return queryset.filter(status='registered')


class ManagerInLine(admin.TabularInline):
    model = Client.manager.through
    extra = 0
    verbose_name = "Персональный менеджер"
    verbose_name_plural = "Персональные менеджеры"


class ContactDetailInLine(admin.TabularInline):
    model = ContactDetail
    extra = 0
    verbose_name = "Контактная информация"
    verbose_name_plural = "Контактная информация"


@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    search_fields = [
        'name',
        'address',
        'phone',
        'email',
    ]
    list_display = [
        'name',
        'address',
        'phone',
        'email',
    ]
    fields = [
        'name',
        'address',
        ('phone', 'email'),
    ]
    list_filter = [
        'name',
    ]


@admin.register(RegistrationOrder)
class RegistrationOrderAdmin(admin.ModelAdmin):
    form = CustomRegOrderForm
    search_fields = [
        'name',
        'organization',
        'identification_number',
        'email',
        'phone',
        'status',
        'manager_talant',
    ]
    list_display = [
        'name',
        'organization',
        'identification_number',
        'email',
        'phone',
        'status',
        'manager_talant'
    ]
    list_filter = [
        'status',
    ]
    fields = [
        'status',
        'name',
        ('organization', 'identification_number'),
        (
            'name_of_manager',
            'email',
            'phone',
        ),
        'manager_talant',
        ('login', 'password'),
    ]
    list_filter = (RegistrationOrderFilter,)

    def check_registration(self, obj):
        if obj:
            return obj.status == 'registered' and \
                Client.objects.filter(registration_order=obj).exists()

    def get_readonly_fields(self, request, obj=None):
        if self.check_registration(obj):
            return [f.name for f in self.model._meta.fields]
        return self.readonly_fields

    def get_fieldsets(self, request, obj=None):
        fieldsets = super().get_fieldsets(request, obj)
        if self.check_registration(obj):
            for fieldset in fieldsets:
                _, field_struct = fieldset
                if ('login', 'password') in field_struct['fields']:
                    field_struct['fields'].remove(('login', 'password'))
        else:
            for fieldset in fieldsets:
                _, field_struct = fieldset
                if not ('login', 'password') in field_struct['fields']:
                    field_struct['fields'].append(('login', 'password'))
   
        return fieldsets

    def get_form(self, request, obj=None, **kwargs):
        form = super().get_form(request, obj, **kwargs)
        return form

    def save_model(self, request, obj, form, change):

        registration_order = form.cleaned_data
        if not registration_order.get('status') or registration_order.get('status') != 'registered':
            return super().save_model(request, obj, form, change)
        
        parsed_manager_name = parse_of_name(registration_order.get('name_of_manager'))
        if not parsed_manager_name:
            raise ValidationError('Не указано ФИО персонального менеджера', code='')

        with transaction.atomic():
            personal_manager, _ = Manager.objects.get_or_create(
                last_name = parsed_manager_name['last_name'],
                first_name = parsed_manager_name['first_name'],
                defaults = {
                    key: value for key, value  in registration_order.items() if \
                        key in ['email', 'phone', 'login', 'password']
                } | parsed_manager_name
            )
            client, created = Client.objects.update_or_create(
                inn=registration_order['identification_number'],
                defaults = {
                    'name'              : registration_order['organization'],
                    'registration_order': obj,
                    'approved_by'       : request.user,
                    'manager_talant'    : registration_order['manager_talant'],
            })
            if created:
                client.manager.add(personal_manager)

                context = {
                    'url'     : request.build_absolute_uri(reverse('clients:change_pass')),
                    'login'   : personal_manager.login,
                    'password': personal_manager.password
                } | self.get_images(['logo.png', 'confirm.jpg'])

                recipient_list = [
                    obj.email,
                    'opt@talant-gold.ru',
                    'Chikunova.Anastasiya@talant-gold.ru',
                ]

                self.send_email(context, recipient_list)

            return super().save_model(request, obj, form, change)
    
    def get_images(self, images):
        result = {}
        static_dir = os.path.join(settings.BASE_DIR, 'static')
        for img_name in images:
            image_path = os.path.join(static_dir, 'img', img_name)
            with open(image_path, 'rb') as image_file:
                image_data = image_file.read()
            base64_image = base64.b64encode(image_data).decode()
            result[img_name.split('.')[0]] = base64_image
        return result

    def send_email(self, context, recipient_list):
        html_content = render_to_string('forms/confirm.html', context)
        subject = 'доступ к личному кабинету на сайте opt.talantgold.ru'
        from_email = settings.EMAIL_HOST_USER
        message = 'доступ к личному кабинету на сайте opt.talantgold.ru'
        send_mail(subject, message, from_email, recipient_list, html_message=html_content)


@admin.register(Manager)
class ManagerAdmin(admin.ModelAdmin):
    search_fields = [
        'first_name',
        'last_name',
        'surname',
    ]
    list_display = [
        'first_name',
        'last_name',
        'surname',
    ]
    list_display_links = ('first_name', 'last_name', 'surname')


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


@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    search_fields = [
        'name',
        'inn',
        'registration_order',
        'approved_by',
        'updated_by',
        'manager_talant',
    ]
    list_display = [
        'status',
        'name',
        'inn',
        'registration_order',
        'created_at',
        'approved_by',
        'manager_talant',
    ]
    fields = [
        'status',
        ('name', 'inn'),
        'registration_order',
        ('created_at', 'approved_by'),
        ('updated_at', 'updated_by'),
        'manager_talant',
    ]
    readonly_fields = [
        'created_at',
        'updated_at',
        'registration_order',
        'approved_by',
        'updated_by',
    ]
    list_filter = [
        'status',
    ]
    inlines = [ManagerInLine, ContactDetailInLine, OrderInLine]
