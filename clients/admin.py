from django.contrib import admin
from django.contrib.admin import SimpleListFilter

from .models import (
    Organization,
    RegistrationOrder,
    Client,
    Manager,
    ContactDetail,
    AuthorizationAttempt
)
from .forms import CustomRegOrderForm
from orders.models import Order
from settings_and_conditions.models import NotificationType
from settings_and_conditions.utils import notification_scheduling


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
        ('additional_phone', 'additional_email'),
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
    fieldsets = (
        (None, {'fields': (
            'status',
            ('organization', 'identification_number'),
            'manager_talant',   
        )}),
        ('Менеджер клиента:', {'fields': (
            'name_of_manager',
            'email',
            'phone',
        )}),
        ('Данные аутентификации:', {'fields': (
            'login',
            'password',
        )})
    )
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
            return tuple(fieldset for fieldset in fieldsets if fieldset[0] != 'Данные аутентификации:')
   
        return fieldsets

    def get_form(self, request, obj=None, **kwargs):
        form = super().get_form(request, obj, **kwargs)
        return form

    @notification_scheduling(NotificationType.CONFIM_REG)
    @notification_scheduling(NotificationType.CANCEL_REG)
    def save_model(self, request, obj, form, change):        
        return super().save_model(request, obj, form, change)


@admin.register(Manager)
class ManagerAdmin(admin.ModelAdmin):
    search_fields = [
        'name',
    ]
    list_display = [
        'name',
    ]
    list_display_links = ('name',)


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

    @notification_scheduling(NotificationType.LOCKED_CLIENT)
    def save_model(self, request, obj, form, change):
        return super().save_model(request, obj, form, change)


@admin.register(AuthorizationAttempt)
class AuthorizationAttemptAdmin(admin.ModelAdmin):
    def get_model_perms(self, request):
        return {
            'add': False,
            'change': False,
            'delete': False,
        }
