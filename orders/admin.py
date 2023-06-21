from django.contrib import admin

from .models import Order, OrderItem


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    fields = [
        'id',
        'product',
        'series',
        'uin',
        'weight',
        'size',
        'quantity',
        'unit',
        'price',
        'sum',
        'discount',
        'price_type'
    ]
    verbose_name = "Номенклатура"
    verbose_name_plural = "Номенклатура"


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    search_fields = [
        'id',
    ]
    list_display = ['id', 'created_at', 'status', 'client', 'manager']
    list_filter = ['status', 'client', 'manager']
    fields = [
        'status',
        'client',
        'manager',
        'created_at',
    ]
    readonly_fields = [
        'created_at',
    ]
    inlines = [OrderItemInline]
