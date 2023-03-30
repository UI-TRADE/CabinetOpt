from django.contrib import admin

from .models import CustomUser


@admin.register(CustomUser)
class CustomUserAdmin(admin.ModelAdmin):
    list_display = (
        'username',
        'email',
        'phone',
        'gender',
        'created_at',
        'is_staff'
    )
    fields = ['username', ('email', 'phone'), ('gender', 'date_of_birth'), 'priority_direction', 'is_staff']

