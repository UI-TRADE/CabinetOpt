from django.contrib import admin
from django.contrib.admin import SimpleListFilter
from django_summernote.admin import SummernoteModelAdmin

from .models import (
    Guarantee,
    Policy,
    Delivery,
    About,
    NotificationType,
    Notification,
    CatalogFilter,
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


class NotificationTypeAdmin(SummernoteModelAdmin):
    list_display = ('subject', 'event',)
    summernote_fields = ('notification',)

    fields = ['subject', 'event', 'notification', 'template', ]


class NotificationAdmin(admin.ModelAdmin): 
    list_display = ('use_up', 'notification_type', 'notify') 
    search_fields = ['notification_type', 'notify']
    fields = ('use_up', 'notification_type', 'notify')

    list_display_links = ('use_up', 'notification_type', 'notify')

    def get_form(self, request, obj=None, change=False, **kwargs):
        form = super().get_form(request, obj, change, **kwargs)
        form.base_fields['use_up'].label = 'использовать'
        form.base_fields['notification_type'].label = 'событие'
        return form
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.filter(manager_talant__isnull=True)


class CatalogFilterAdmin(admin.ModelAdmin):
    list_display = (
        'metals',
        'metal_finish',
        'brands',
        'prod_status',
        'collections',
        'genders',
        'sizes',
        'gems',
        'colors',
        'cuts',
        'quantity_range',
        'instok_range',
        'price_range',
        'weight_range',
    )
    fieldsets = (
        (None, {
            'fields': (
                'metals',
                'metal_finish',
                'brands',
                'prod_status',
                'collections',
                'genders',
                'sizes',
                'gems',
                'colors',
                'cuts',
                'quantity_range',
                'instok_range',
                'price_range',
                'weight_range',
            )
        }),
        ('Advanced options', {
            'classes': ('collapse',),
            'fields': ('hide_count_of_products',),
        }),
    )


admin.site.register(Guarantee, GuaranteeAdmin)
admin.site.register(Policy, PolicyAdmin)
admin.site.register(Delivery, DeliveryAdmin)
admin.site.register(About, AboutAdmin)

admin.site.register(NotificationType, NotificationTypeAdmin)
admin.site.register(Notification, NotificationAdmin)
admin.site.register(CatalogFilter, CatalogFilterAdmin)
