from django.contrib import admin

from .models import CustomUser
from settings_and_conditions.models import Notification


class NotificationInLine(admin.TabularInline):
    model = Notification
    fk_name = 'manager_talant'
    extra = 0
    fields = ('use_up', 'notification_type',)
    # classes = ('collapse', )

    verbose_name = 'Уведомление'
    verbose_name_plural = 'Уведомления'


@admin.register(CustomUser)
class CustomUserAdmin(admin.ModelAdmin):
    list_display = (
        'username',
        'name',
        'email',
        'phone',
        'gender',
        'created_at',
        'is_staff'
    )
    fields = [
        ('username', 'name'),
        ('email', 'phone'),
        ('gender', 'date_of_birth'),
        'groups',
        'is_staff'
    ]

    inlines = [NotificationInLine]
