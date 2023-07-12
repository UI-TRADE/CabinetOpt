import json
from django.contrib import admin
from django.core.serializers import serialize
from django.http import HttpResponse

from .models import Order, OrderItem
from clients.models import Client, Manager
from catalog.models import Product


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
    actions = ['export_selected_objects']

    @admin.action(description="Выгрузить заказы")
    def export_selected_objects(modeladmin, request, queryset):
        
        orders = modeladmin.add_related_fields(
            json.loads(serialize('json', queryset)),
            ['client', 'manager']
        )

        for order in orders:
            order['items'] = modeladmin.add_related_fields(
                json.loads(
                    serialize(
                        'json', OrderItem.objects.filter(order_id=order['pk'])
                )),
                ['product']
            )

        response = HttpResponse(json.dumps(orders), content_type='application/json')
        response['Content-Disposition'] = 'attachment; filename="order_export.json"'
        return response
    
    def add_related_fields(self, data, fields):

        def get_queryset(field, pk):
            if field == 'client':
                return Client.objects.filter(pk = pk)
            elif field == 'manager':
                return Manager.objects.filter(pk = pk)
            elif field == 'product':
                return Product.objects.filter(pk = pk)

        for item in data:
            for field in fields:
                item['fields'][field] = json.loads(
                serialize(
                    'json',
                    get_queryset(field, item['fields'][field])
                ))
        
        return data
