import csv
from contextlib import suppress
from django.contrib import admin
from django.http import HttpResponse
from django.db.models import Avg, Sum
from django.utils.html import format_html

from .models import (
    CollectionGroup,
    Collection,
    Brand,
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
    Design,
    Style,
)

class CollectionInLine(admin.TabularInline):
    model = Collection
    fk_name = 'group'
    extra = 0
    fields = ('name',)

    verbose_name = 'вид коллекции'
    verbose_name_plural = 'виды коллекций'


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
    fields = ('render_preview', 'image', 'filename', 'order')
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
        'precious_stone',
        ('precious_filter', 'color_filter'),
        ('cut_type', 'gem_color'),
        ('gem_weight', 'gem_quantity'),
        'comment',
        'description',
    )
    readonly_fields = ()

    verbose_name = "Вставка"
    verbose_name_plural = "Вставки"


@admin.register(Brand)
class BrandAdmin(admin.ModelAdmin):
    search_fields = ['name',]
    list_display = ['name',]
    fields = ['name',]
    readonly_fields = ['identifier_1C',]


@admin.register(CollectionGroup)
class CollectionGroupAdmin(admin.ModelAdmin):
    search_fields = ['order', 'name',]
    fields = ['order', 'name',]
    inlines = [CollectionInLine,]


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

    # def get_model_perms(self, *args, **kwargs):
    #     return {}


class ProductPriceFilter(admin.SimpleListFilter):
    title = ('Базовая цена')
    parameter_name = 'set_price'

    def lookups(self, request, model_admin):
        return (
            ('set_price', ('Установлена')),
            ('unset_price', ('Не установлена')),
        )

    def queryset(self, request, queryset):
        active_products = queryset.filter(
            pk__in=Price.objects.filter(
                type__name="Базовая", price__gt=0
            ).values_list(
                'product_id', flat=True
        ))
        if self.value() == 'set_price':
            return active_products
        if self.value() == 'unset_price':
            return queryset.exclude(pk__in=active_products.values_list('id', flat=True))


class ProductImageFilter(admin.SimpleListFilter):
    title = ('Изображения')
    parameter_name = 'set_img'

    def lookups(self, request, model_admin):
        return (
            ('set_img', ('Есть')),
            ('unset_img', ('Нет')),
        )

    def queryset(self, request, queryset):
        active_products = queryset.filter(
            pk__in=ProductImage.objects.values_list(
                'product_id', flat=True
        ))
        if self.value() == 'set_img':
            return active_products
        if self.value() == 'unset_img':
            return queryset.exclude(pk__in=active_products.values_list('id', flat=True))


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    search_fields = [
        'name',
        'articul',
    ]
    list_display = [
        'image_icon',
        'articul',
        'show_on_site',
        'price',
        'name',
        'product_type',
        'ct_color',
        'avg_weight',
        'unit',
        'available_for_order',
        'stock',
        'status',
        'gem_set',
        'brand',
        'collection',
    ]
    fields = [
        'image_tag',
        'product_type',
        'status',
        ('name', 'articul', 'unit'),
        ('brand', 'collection'),
        ('metal', 'metal_content', 'color', 'str_color'),
        ('show_on_site', 'available_for_order'),
        ('lock_type_earings', 'lock_type_chain', 'lock_type_bracelet'),
        ('chain_width', 'bracelet_width'),
        ('chain_weave', 'bracelet_weave'),
        'q_borders_c_b',
        'mark_description'
    ]
    list_filter = [
        'show_on_site',
        ProductImageFilter,
        ProductPriceFilter,
        'brand',
        'collection',
        'product_type',
        'status',
        'metal',
        'metal_content',
        'color',
        'available_for_order',
    ]
    readonly_fields = [
        'image_tag',
        'created_at',
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
    list_display_links = (
        'image_icon',
        'articul',
        'show_on_site',
        'price',
        'name',
        'product_type',
        'ct_color',
        'avg_weight',
        'unit',
        'available_for_order',
        'stock',
        'status',
        'gem_set',
        'brand',
        'collection',
    )
    actions = ['export_as_csv']

    def ct_color(self, obj):
        if obj.str_color:
            return obj.str_color
        return f'{obj.metal} {obj.color} {obj.metal_content}`'
    ct_color.short_description = 'Цвет металла'
    ct_color.admin_order_field = 'color'

    def avg_weight(self, obj):
        result = StockAndCost.objects.filter(product_id=obj.id).aggregate(Avg('weight'))
        if not result['weight__avg']:
            return 0
        return round(result['weight__avg'], 3)
    avg_weight.short_description = 'Ср.вес, гр'

    def stock(self, obj):
        stocks = StockAndCost.objects.get_stocks(obj.id)
        if stocks:
            return stocks.get('total_stock', 0)
        return 0
    stock.short_description = 'Остаток, шт'

    def gem_set(self, obj):
        with suppress(AttributeError):
            result = GemSet.objects.filter(product_id=obj.id).order_by('-description').first()
            return result.description
        return ''
    gem_set.short_description = 'Вставки'

    def price(self, obj):
        result = 0
        base_price = Price.objects.filter(type__name="Базовая", product_id=obj.id, price__gt=0).first()
        if base_price:
            result = base_price.price
        return result
    price.short_description = 'Цена, руб'

    def image_icon(self, obj):
        img = ProductImage.objects.filter(product_id=obj.id).first()
        if img:
            return format_html(
                '<img src="{0}" width="50" height="50" />'.format(img.image.url)
            )
    image_icon.short_description = '.'

    def image_tag(self, obj):
        img = ProductImage.objects.filter(product_id=obj.id).first()
        return format_html(
            '<img src="{0}" width="150" height="150" />'.format(img.image.url)
        )
    image_tag.short_description = 'Изображение'

    @admin.action(description='Выгрузить в csv файл')
    def export_as_csv(self, request, queryset):
        meta = self.model._meta
        field_names = [field.name for field in meta.fields]

        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename={}.csv'.format(meta)
        writer = csv.writer(response)

        writer.writerow(field_names)
        for obj in queryset:
            row = writer.writerow([getattr(obj, field) for field in field_names])

        return response


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
        'product__name',
        'product__articul',
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
        'short_title',
    ]
    fields = [
        'name',
        'short_title',
        'cut_type_image',
    ]


@admin.register(GemSet)
class GemSetAdmin(admin.ModelAdmin):
    search_fields = [
        'product',
        'precious_stone',
        'precious_filter',
        'color_filter',
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
        ('color_filter', 'precious_filter'),
    ]
    list_filter = [
        'precious_filter',
        'precious_stone',
        'color_filter',
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


@admin.register(Style)
class StyleAdmin(admin.ModelAdmin):
    search_fields = ['name',]
    fields = ['name',]
