from django.contrib import admin

from .models import (
    PriorityDirection,
    RegistrationOrder
)


@admin.register(PriorityDirection)
class PriorityDirectionAdmin(admin.ModelAdmin):
    search_fields = [
        'name',
    ]
    list_display = [
        'name',
    ]


@admin.register(RegistrationOrder)
class RegistrationOrderAdmin(admin.ModelAdmin):
    search_fields = [
        'name',
        'inn',
        'manager',
        'email',
        'phone',
        'status',
    ]
    list_display = [
        f.name for f in RegistrationOrder._meta.get_fields() if f.name != 'id'
    ]
    fields = [('name', 'inn'), ('manager', 'email', 'phone'), 'priority_direction', 'status']
    readonly_fields = ['status']
