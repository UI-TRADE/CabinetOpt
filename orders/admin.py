from django.contrib import admin
from django.utils.html import format_html

from .models import (
    Collection,
    ProductImage,
    Product,
    PriceType,
    Price,
    Order,
    OrderItem
)

class ProductImageInLine(admin.TabularInline):
    model = ProductImage
    extra = 0
    fields = ('image', 'filename', 'render_preview')
    readonly_fields = ('render_preview',)

    verbose_name = "Фотография"
    verbose_name_plural = "Фотографии"

    def render_preview(self, obj):
        if obj.image:
            print(format_html(
                '<img src="{0}" width="50" height="50" />'.format(obj.image.url)
            ))
            return format_html(
                '<img src="{0}" width="50" height="50" />'.format(obj.image.url)
            )
        else:
            return '(No image)'

    render_preview.short_description = 'Preview'


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    fields = [
        'id',
        'product',
        'series',
        'uin',
        'weight',
        'quantity',
        'unit',
        'price',
        'sum',
        'discount',
        'price_type'
    ]
    verbose_name = "Номенклатура"
    verbose_name_plural = "Номенклатура"


@admin.register(Collection)
class CollectionAdmin(admin.ModelAdmin):
    search_fields = [
        'name',
    ]
    list_display = [
        'name',
        'discount',
    ]
    fields = [
        'name',
        'discount',
    ]


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    search_fields = [
        'name',
        'articul',
    ]
    list_display = [
        'product_type',
        'name',
        'articul',
        'brand',
        'collection',
        'unit',
        'price_per_gr',
        'weight',
        'size',
        'stock',
        'available_for_order',
        'created_at',
    ]
    fields = [
        'product_type',
        ('name', 'articul', 'unit'),
        ('brand', 'collection'),
        ('size', 'weight', 'price_per_gr'),
        'stock',
        'available_for_order',
    ]
    list_filter = [
        'brand',
        'collection',
        'product_type',
        'available_for_order'
    ]
    readonly_fields = [
        'created_at', 'stock'
    ]
    inlines = [ProductImageInLine]


@admin.register(PriceType)
class PriceTypeAdmin(admin.ModelAdmin):
    search_fields = [
        'name',
    ]
    list_display = [
        'name',
    ]
    fields = [
        'name',
    ]


@admin.register(Price)
class PriceAdmin(admin.ModelAdmin):
    search_fields = [
        'product',
    ]
    list_display = [
        'type',
        'product',
        'unit',
        'price',
        'start_at',
        'end_at',
    ]
    fields = [
        'type',
        'product',
        ('price', 'unit'),
        ('start_at', 'end_at'),
    ]
    list_filter = [
        'type',
    ]
    readonly_fields = [
        'start_at',
    ]


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
