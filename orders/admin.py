from django.contrib import admin

from .models import (
    Collection,
    ProductImage,
    Product,
)

class ProductImageInLine(admin.TabularInline):
    model = ProductImage
    extra = 0
    fields = ['image']
    verbose_name = "Фотография"
    verbose_name_plural = "Фотографии"


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
        'collection',
        'brand',
        'image',
        'price_per_gr',
        'weight',
        'size',
        'stock',
        'available_for_order',
        'created_at',
        'product_type',
    ]
    list_display = [
        'product_type',
        'name',
        'articul',
        'brand',
        'collection',
        'price_per_gr',
        'weight',
        'size',
        'stock',
        'available_for_order',
        'created_at',
    ]
    fields = [
        'product_type',
        ('name', 'articul'),
        ('brand', 'collection'),
        ('size', 'weight', 'price_per_gr'),
        'stock',
        'available_for_order',
    ]
    readonly_fields = [
        'created_at', 'stock'
    ]
    inlines = [ProductImageInLine]
