from django.contrib import admin
from django_summernote.admin import SummernoteModelAdmin

from .models import (
    Guarantee,
    Policy,
    Delivery,
    About,
    Notification,
)

class GuaranteeAdmin(SummernoteModelAdmin): 
    list_display = ('organization',) 
    search_fields = ['organization',]
    summernote_fields = ('guarantee',)


class PolicyAdmin(SummernoteModelAdmin): 
    list_display = ('organization',) 
    search_fields = ['organization',]
    summernote_fields = ('policy',)


class DeliveryAdmin(SummernoteModelAdmin): 
    list_display = ('organization',) 
    search_fields = ['organization',]
    summernote_fields = ('delivery',)


class AboutAdmin(SummernoteModelAdmin): 
    list_display = ('organization',) 
    search_fields = ['organization',]
    summernote_fields = ('about',)


class NotificationAdmin(admin.ModelAdmin): 
    list_display = ('use_up', 'notification_type', 'email',) 
    search_fields = ['notification_type', 'email']
    fields = (('use_up', 'notification_type', 'email'),)

    def get_form(self, request, obj=None, change=False, **kwargs):
        form = super().get_form(request, obj, change, **kwargs)
        form.base_fields['use_up'].label = ''
        form.base_fields['notification_type'].label = ''
        return form


admin.site.register(Guarantee, GuaranteeAdmin)
admin.site.register(Policy, PolicyAdmin)
admin.site.register(Delivery, DeliveryAdmin)
admin.site.register(About, AboutAdmin)

admin.site.register(Notification, NotificationAdmin)
