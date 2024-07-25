from django.contrib import admin
from django.contrib.auth.hashers import make_password

from .models import CustomUser
from settings_and_conditions.models import Notification

from .forms import UserPasswordChangeForm


class NotificationInLine(admin.TabularInline):
    model = Notification
    fk_name = 'manager_talant'
    extra = 0
    fields = ('use_up', 'notification_type',)

    verbose_name = 'Уведомление'
    verbose_name_plural = 'Уведомления'


@admin.register(CustomUser)
class CustomUserAdmin(admin.ModelAdmin):
    form = UserPasswordChangeForm

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
        ('username', 'password_field'),
        'name',
        ('email', 'phone'),
        ('gender', 'date_of_birth'),
        'groups',
        'is_staff'
    ]

    inlines = [NotificationInLine]

    def get_form(self, request, obj=None, **kwargs):
        if obj:
            kwargs['form'] = self.form 
        form = super().get_form(request, obj, **kwargs)
        form.base_fields["username"].label = 'Логин'
        form.base_fields["password_field"].label = 'Пароль'
        return form
    
    def save_model(self, request, obj, form, change):
        if form.cleaned_data['password_field'] and form.cleaned_data['password_field'] != '********':
            obj.set_password(form.cleaned_data['password_field'])
        super().save_model(request, obj, form, change)
