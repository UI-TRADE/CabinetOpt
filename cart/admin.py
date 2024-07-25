from django.contrib import admin

from .models import Basket


@admin.register(Basket)
class BasketAdmin(admin.ModelAdmin):
    search_fields = ['client__name', 'manager__name']
    list_display = ['client', 'manager', 'key', 'attributes']
    fields = ['client', 'manager', 'key', 'attributes',]
    readonly_fields = ['client', 'manager',]

    def has_add_permission(self, request, obj=None):
        return False
