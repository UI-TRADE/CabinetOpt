import json
from django.db.models import Sum
from django.contrib import admin
from django import forms
from django.core.serializers import serialize
from django.http import HttpResponse
from contextlib import suppress

from .models import Order, OrderItem
from clients.models import Client, Manager
from catalog.models import Product, Price


class CustomOrderItemForm(forms.ModelForm):

    class Meta:
        model = OrderItem
        fields = '__all__'


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    form = CustomOrderItemForm
    readonly_fields = (
        'articul',
        'unit',
        'avg_weight',
        'price_per_weight',
        'total_weight',
    )
    fields = [
        'articul',
        'product',
        'size',
        'avg_weight',
        'quantity',
        'unit',
        'total_weight',
        'price_per_weight',
        'sum',
        'discount',
    ]
    extra = 0
    verbose_name = "Номенклатура"
    verbose_name_plural = "Номенклатура"

    def articul(self, obj):
        return obj.product.articul
    articul.short_description = 'Артикул'

    def avg_weight(self, obj):
        if obj.quantity != 0:
            return format(obj.weight / obj.quantity, '.3f')
        return 0
    avg_weight.short_description = 'Вес за шт'

    def total_weight(self, obj):
        return format(obj.weight, '.3f')
    total_weight.short_description = 'Общ.вес'

    def price_per_weight(self, obj):
        if obj.unit == '163':
            return obj.price
        with suppress(Price.DoesNotExist):
            found_entry = Price.objects.available_prices(
                [obj.product.id]
            ).filter(unit='163').get()
            return found_entry.price
        return 0
    price_per_weight.short_description = 'Цена, руб/г'

    def price_per_quantity(self, obj):
        avg_weight = 0
        if obj.quantity != 0:
            avg_weight = obj.weight / obj.quantity
        if obj.unit == '163':
            return obj.price * avg_weight
        with suppress(Price.DoesNotExist):
            found_entry = Price.objects.available_prices(
                [obj.product.id]
            ).filter(unit='163').get()
            return round((float(found_entry.price) * avg_weight), 2)
        return 0
    price_per_quantity.short_description = 'Цена, шт.'


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    search_fields = [
        'id',
    ]
    list_display = [
        'ct_id',
        'ct_created_at',
        'status',
        'ct_order_sum',
        'ct_manager',
        'client',
        'ct_client',
        'ct_manager_ui',
        'ct_num_ui'
    ]
    list_display_links = ('ct_id', 'ct_num_ui')
    list_filter = ['status', 'client', 'manager']
    fields = [
        'status',
        'client',
        'manager',
        'ct_created_at',
    ]
    ordering = ('id', 'created_at', 'status', 'client', 'manager', 'num_in_1C')
    readonly_fields = [
        'ct_created_at',
    ]
    inlines = [OrderItemInline]
    actions = ['export_selected_objects']

    def ct_id(self, obj):
        return f'{obj.id}/{obj.provision}'
    ct_id.short_description = 'Номер заказа'
    ct_id.admin_order_field = 'id'

    def ct_created_at(self, obj):
        return obj.created_at
    ct_created_at.short_description = 'Дата заказа'
    ct_created_at.admin_order_field = 'created_at'

    def ct_order_sum(self, obj):
        result = OrderItem.objects.filter(order=obj).aggregate(Sum('sum'))
        return result['sum__sum']
    ct_order_sum.short_description = 'Сумма'

    def ct_manager(self, obj):
        return obj.manager
    ct_manager.short_description = 'Mенеджер клиента (пользователь)'
    ct_manager.admin_order_field = 'manager'

    def ct_client(self, obj):
        return obj.client
    ct_client.short_description = 'ЮЛ клиента'

    def ct_manager_ui(self, obj):
        return obj.client.registration_order.manager_talant
    ct_manager_ui.short_description = 'менеджер ЮИ-Трейд'

    def ct_num_ui(self, obj):
        return obj.num_in_1C
    ct_num_ui.short_description = 'номер в ЮТД'
    ct_num_ui.admin_order_field = 'num_in_1C'

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
