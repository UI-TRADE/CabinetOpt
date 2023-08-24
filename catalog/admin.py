from django.contrib import admin
from django.utils.html import format_html

from .models import (
    CollectionGroup,
    Collection,
    ProductImage,
    Product,
    PriceType,
    Price,
    StockAndCost,
    PreciousStone,
    CutType,
    GemSet,
    ProductsSet,
    SimilarProducts,
    Size,
    Gender
)

class ProductImageInLine(admin.TabularInline):
    model = ProductImage
    extra = 0
    fields = ('image', 'filename', 'render_preview')
    readonly_fields = ('render_preview',)
    classes = ('collapse', )

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


class ProductsSetInLine(admin.TabularInline):
    model = ProductsSet
    fk_name = 'product'
    extra = 0
    fields = ('accessory',)
    classes = ('collapse', )

    verbose_name = 'элемент состава'
    verbose_name_plural = 'элементы состава'


class SimilarProductsInLine(admin.TabularInline):
    model = SimilarProducts
    fk_name = 'product'
    extra = 0
    fields = ('similar_product',)
    classes = ('collapse', )

    verbose_name = 'аналог'
    verbose_name_plural = 'аналоги'


class StockAndCostInLine(admin.TabularInline):
    model = StockAndCost
    extra = 0
    fields = ('weight', 'size', 'stock', 'cost')
    readonly_fields = ()
    classes = ('collapse', )

    verbose_name = "Наличие и стоимость изделия"
    verbose_name_plural = "Наличие и стоимость изделий"


class GemSetInLine(admin.StackedInline):
    model = GemSet
    extra = 0
    fields = (
        'product',
        'order',
        ('precious_stone', 'cut_type', 'color'),
        ('weight', 'quantity'),
        'comment',
        'description',
    )
    readonly_fields = ()

    verbose_name = "Вставка"
    verbose_name_plural = "Вставки"


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
    inlines = [
        GemSetInLine,
        StockAndCostInLine,
        ProductImageInLine,
        ProductsSetInLine,
        SimilarProductsInLine
    ]


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

    def get_form(self, request, obj=None, change=False, **kwargs):
        form = super().get_form(request, obj, change, **kwargs)
        if obj:
            form.base_fields['price'].label = 'Цена за грамм' if obj.unit == '163' else 'Цена'
        return form


@admin.register(PreciousStone)
class PreciousStoneAdmin(admin.ModelAdmin):
    search_fields = [
        'name',
    ]
    fields = [
        'name',
        'short_title',
    ]


@admin.register(CutType)
class CutTypeAdmin(admin.ModelAdmin):
    search_fields = [
        'name',
    ]
    fields = [
        'name',
    ]


@admin.register(GemSet)
class GemSetAdmin(admin.ModelAdmin):
    search_fields = [
        'product',
        'precious_stone',
        'cut_type',
    ]
    list_display = [
        'product',
        'precious_stone',
        'color',
        'weight',
        'order',
        'cut_type',
        'quantity',
        'comment',
    ]
    fields = [
        'product',
        'order',
        ('precious_stone', 'cut_type', 'color'),
        ('weight', 'quantity'),
        'comment',
        'description',
    ]
    list_filter = [
        'precious_stone',
        'cut_type',
    ]

    def get_model_perms(self, *args, **kwargs):
        return {}


@admin.register(Size)
class SizeAdmin(admin.ModelAdmin):
    search_fields = [
        'size_from',
        'size_to',
    ]
    fields = [
        ('size_from', 'size_to'),
    ]

    def save_model(self, request, obj, form, change):
        if obj.size_from and not obj.size_to:
            obj.size_to = obj.size_from
        
        obj.name = f'{obj.size_from:g}'
        if obj.size_to and obj.size_from != obj.size_to:
            obj.name = f'{obj.size_from:g}-{obj.size_to:g}'
   
        obj.save()


@admin.register(Gender)
class GenderAdmin(admin.ModelAdmin):
    search_fields = ['name',]
    fields = ['name',]
