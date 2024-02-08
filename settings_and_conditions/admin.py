from django.contrib import admin
from django_summernote.admin import SummernoteModelAdmin

from .models import (
    Guarantee,
    Policy,
    Delivery,
    About,
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


admin.site.register(Guarantee, GuaranteeAdmin)
admin.site.register(Policy, PolicyAdmin)
admin.site.register(Delivery, DeliveryAdmin)
admin.site.register(About, AboutAdmin)
