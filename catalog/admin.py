from django.contrib import admin
from django.utils.html import format_html

from .models import (
    CollectionGroup,
    Collection,
    ProductImage,
    Product,
    PriceType,
    Price,
    StockAndCost
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


class StockAndCostInLine(admin.TabularInline):
    model = StockAndCost
    extra = 0
    fields = ('weight', 'size', 'stock', 'cost')
    readonly_fields = ()

    verbose_name = "Наличие и стоимость изделия"
    verbose_name_plural = "Наличие и стоимость изделий"


@admin.register(CollectionGroup)
class CollectionGroupAdmin(admin.ModelAdmin):
    search_fields = [
        'name',
    ]
    fields = [
        'name',
    ]

    def get_model_perms(self, *args, **kwargs):
        return {}


@admin.register(Collection)
class CollectionAdmin(admin.ModelAdmin):
    search_fields = [
        'group',
        'name',
    ]
    list_display = [
        'group',
        'name',
        'discount',
    ]
    fields = [
        'group',
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
        'articul',
        'name',
        'brand',
        'collection',
        'metal',
        'metal_content',
        'color',
        'unit',
        'available_for_order',
        'status',
        'created_at',
    ]
    fields = [
        'product_type',
        'status',
        ('name', 'articul', 'unit'),
        ('brand', 'collection'),
        ('metal', 'metal_content', 'color'),
        'gender',
        'available_for_order',
    ]
    list_filter = [
        'brand',
        'collection',
        'product_type',
        'status',
        'metal',
        'metal_content',
        'color',
        'gender',
        'available_for_order'
    ]
    readonly_fields = [
        'created_at'
    ]
    inlines = [StockAndCostInLine, ProductImageInLine]


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
        'discount',
        ('start_at', 'end_at'),
    ]
    list_filter = [
        'type',
    ]
    readonly_fields = [
        'start_at',
    ]
