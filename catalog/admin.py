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
    Gender,
    MetalFinish,
    Gift,
    Design
)

class GenderInLine(admin.TabularInline):
    model = Product.gender.through
    extra = 0
    classes = ('collapse', )
    verbose_name = "для кого"
    verbose_name_plural = "для кого"


class MetalFinishInLine(admin.TabularInline):
    model = Product.metal_finish.through
    extra = 0
    classes = ('collapse', )
    verbose_name = "Вид обработки металла"
    verbose_name_plural = "Виды обработки металла"


class GiftInLine(admin.TabularInline):
    model = Product.gift.through
    extra = 0
    classes = ('collapse', )
    verbose_name = "Подарок"
    verbose_name_plural = "Подарки"


class DesignInLine(admin.TabularInline):
    model = Product.design.through
    extra = 0
    classes = ('collapse', )
    verbose_name = "Дизайн"
    verbose_name_plural = "Дизайны"


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
        ('product', 'size'),
        'order',
        ('precious_stone', 'cut_type', 'gem_color'),
        ('gem_weight', 'gem_quantity'),
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
        ('metal', 'metal_content', 'color', 'str_color'),
        'available_for_order',
        ('lock_type_earings', 'lock_type_chain', 'lock_type_bracelet'),
        ('chain_width', 'bracelet_width'),
        ('chain_weave', 'bracelet_weave'),
        'q_borders_c_b'
    ]
    list_filter = [
        'brand',
        'collection',
        'product_type',
        'status',
        'metal',
        'metal_content',
        'color',
        'available_for_order'
    ]
    readonly_fields = [
        'created_at'
    ]
    inlines = [
        GenderInLine,
        MetalFinishInLine,
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
        'gem_color',
        'gem_weight',
        'order',
        'cut_type',
        'gem_quantity',
        'comment',
    ]
    fields = [
        'product',
        'order',
        ('precious_stone', 'cut_type', 'gem_color'),
        ('gem_weight', 'gem_quantity'),
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


@admin.register(MetalFinish)
class MetalFinishAdmin(admin.ModelAdmin):
    search_fields = ['name',]
    fields = ['name',]


@admin.register(Gift)
class GiftAdmin(admin.ModelAdmin):
    search_fields = ['name',]
    fields = ['name',]


@admin.register(Design)
class DesignAdmin(admin.ModelAdmin):
    search_fields = ['name',]
    fields = ['name',]
