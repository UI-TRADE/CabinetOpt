from django.contrib import admin
from django.utils.html import format_html

from .models import (
    Collection,
    ProductImage,
    Product,
    PriceType,
    Price,
    ProductCost
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
            return format_html(
                '<img src="{0}" width="50" height="50" />'.format(obj.image.url)
            )
        else:
            return '(No image)'

    render_preview.short_description = 'Preview'


class ProductCostInLine(admin.TabularInline):
    model = ProductCost
    extra = 0
    fields = ('weight', 'size', 'cost')
    readonly_fields = ()

    verbose_name = "Стоимость изделия"
    verbose_name_plural = "Стоимость изделий"


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
        'metal',
        'metal_content',
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
        ('metal', 'metal_content'),
        ('size', 'weight', 'price_per_gr'),
        'stock',
        'available_for_order',
    ]
    list_filter = [
        'brand',
        'collection',
        'product_type',
        'metal',
        'metal_content',
        'available_for_order'
    ]
    readonly_fields = [
        'created_at', 'stock'
    ]
    inlines = [ProductCostInLine, ProductImageInLine]


@admin.register(PriceType)
class PriceTypeAdmin(admin.ModelAdmin):
    search_fields = [
        'name',
        'client',
    ]
    list_display = [
        'name',
        'client',
    ]
    fields = [
        'name',
        'client',
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
