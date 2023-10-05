import django_filters
from django_filters import BooleanFilter, CharFilter, BaseInFilter
from django.db.models import Count, Sum, Q

from .models import Product, StockAndCost, GemSet, PriceType, Price


class FilterTree(object):

    def __init__(self, qs):
        self.tree = []
        self.qs = qs


    def count(self, root_field, *node_fields):
        roots = self.qs.values(root_field).annotate(count=Count('id'))
        for root in roots:
            if node_fields:
                nodes = self.qs.filter(Q((root_field, root[root_field]))).values(*node_fields).annotate(count=Count('id'))
                if nodes:
                    root['nodes'] = nodes
            self.tree.append(root)

    def sum(self, root_field, *node_fields):
        roots = self.qs.values(root_field).annotate(sum=Sum('stock'))
        for root in roots:
            if node_fields:
                nodes = self.qs.filter(Q((root_field, root[root_field]))).values(*node_fields).annotate(count=Count('id'))
                if nodes:
                    root['nodes'] = nodes
            self.tree.append(root)


class CharInFilter(BaseInFilter, CharFilter):
    pass


class ProductFilter(django_filters.FilterSet):
    in_stock                = BooleanFilter(field_name = 'in_stock', method='instock_filter')
    available_for_order     = BooleanFilter(field_name = 'available_for_order')
    metal                   = CharInFilter(field_name = 'metal', lookup_expr='in')
    metal_finish__name      = CharInFilter(field_name = 'metal_finish__name', lookup_expr='in')
    color                   = CharInFilter(field_name = 'color', lookup_expr='in')
    metal_content           = CharInFilter(field_name = 'metal_content', lookup_expr='in')
    brand__name             = CharInFilter(field_name = 'brand__name', lookup_expr='in')
    status                  = CharInFilter(field_name = 'status', lookup_expr='in')
    collection__group__name = CharInFilter(field_name = 'collection__group__name', lookup_expr='in')
    collection__name        = CharInFilter(field_name = 'collection__name', lookup_expr='in')
    gender__name            = CharInFilter(field_name = 'gender__name', lookup_expr='in')
    
    size__name              = CharFilter(method='size_filter')
    precious_stone__name    = CharFilter(method='gems_filter')
    gem_color               = CharFilter(method='gems_filter')
    cut_type__name          = CharFilter(method='gems_filter')

    weight = django_filters.NumericRangeFilter(
        field_name='weight',
        lookup_expr='range',
        method='weight_filter'
    )
    price = django_filters.NumericRangeFilter(
        field_name='price',
        lookup_expr='range',
        method='price_filter'
    )
    gem_quantity = django_filters.NumericRangeFilter(
        field_name='gem_quantity',
        lookup_expr='range',
        method='gem_quantity_filter'
    )

    class Meta:
        model = Product
        fields = [
            'metal',
            'color',
            'metal_content',
            'status',
        ]
    

    def instock_filter(self, queryset, name, value):
        print(queryset, name, value, sep=', ')
        return queryset.filter(
            pk__in=StockAndCost.objects.filter(stock__gte=0).values_list('product_id', flat=True)
        )


    def size_filter(self, queryset, name, value):
        return queryset.filter(
            pk__in=StockAndCost.objects.filter(
                Q((f'{name}__in', value.split(',')))
            ).values_list('product_id', flat=True)
        )
    
    def gems_filter(self, queryset, name, value):
        return queryset.filter(
            pk__in=GemSet.objects.filter(
                Q((f'{name}__in', value.split(',')))
            ).values_list('product_id', flat=True)
        )
    
    def weight_filter(self, queryset, name, value):
        filters = {}
        if value.start:
            filters[f'{name}__gte'] = value.start
        if value.stop:
            filters[f'{name}__lte'] = value.stop    
        return queryset.filter(
            pk__in=StockAndCost.objects.filter(
                **filters
            ).values_list('product_id', flat=True)
        )
    
    def price_filter(self, queryset, name, value):
        filters = {}
        if value.start:
            filters[f'{name}__gte'] = value.start
        if value.stop:
            filters[f'{name}__lte'] = value.stop    
        return queryset.filter(
            pk__in=Price.objects.filter(
                type=PriceType.objects.get(name='Базовая'),
                **filters
            ).values_list('product_id', flat=True)
        )

    def gem_quantity_filter(self, queryset, name, value):
        filters = {}
        if value.start:
            filters[f'{name}__gte'] = value.start
        if value.stop:
            filters[f'{name}__lte'] = value.stop    
        return queryset.filter(
            pk__in=GemSet.objects.filter(
                **filters
            ).values_list('product_id', flat=True)
        )
