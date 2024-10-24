import re
import ast
import django_filters
from django_filters import BooleanFilter, CharFilter, BaseInFilter
from django.db.models import Count, Sum, Q, Case, When, IntegerField
from django.db.models import Value as V
from functools import reduce
from itertools import permutations

from .models import Product, StockAndCost, GemSet, PriceType, Price


class FilterTree(object):

    def __init__(self, qs=None):
        self.tree = []
        self.qs = qs
    
    def __serialize_root(self, root, root_field):
        def get_ident():
            if root[root_field]:
                return '%s_%s' % (root_field, re.sub(r'[^a-zA-Zа-яА-Я0-9]', '', root[root_field]).lower())
            return root_field
        
        return root | {'name': root_field, 'ident': get_ident()}

    def __serialize_node(self, parent, node, node_fields):
        def get_ident(item):
            result = ''
            for node_field in node_fields:
                if not item[node_field]:
                    continue
                result += '%s_%s_%s' % (
                    node_field,
                    re.sub(r'[^a-zA-Zа-яА-Я0-9]', '', parent).lower(),
                    re.sub(r'[^a-zA-Zа-яА-Я0-9]', '', item[node_field]).lower()
                )
            return result
        
        return [element for element in [item | {'name': '_'.join(node_fields), 'ident': get_ident(item)} for item in node] if element['ident']]

    def to_json(self):
        result = []
        for item in self.tree:
            result.append({key: value for key, value in item.items() if key != 'nodes'})

            if item.get('nodes'):
                result.extend([
                    {
                        key: value for key, value in node.items()
                    } for node in item['nodes']
                ])
        return result

    def count(self, root_field, *node_fields, **kwargs):
        def calc_products_by_precious_gems(precious_filter):
            result = self.qs.filter(precious_filter=precious_filter).values('precious_filter', 'product_id').distinct().count()
            return result
        
        if self.qs:
            root_order = kwargs.get('root_order', [])
            node_order = kwargs.get('node_order', [])
            qs = self.qs.values(root_field).annotate(count=Count('id'))
            if root_order:
                qs = qs.order_by(*root_order)
            for root in qs:
                # root = dict(item)
                if not root[root_field]:
                    continue
                if node_fields:
                    node_qs = self.qs.filter(Q((root_field, root[root_field]))).values(*node_fields).annotate(count=Count('id'))
                    if node_order:
                        node_qs = node_qs.order_by(*node_order)   
                    if node_qs:
                        root['nodes'] = self.__serialize_node(root[root_field], node_qs, node_fields)
                
                if root_field == 'precious_filter':
                    root['count'] = calc_products_by_precious_gems(root[root_field])    
                self.tree.append(self.__serialize_root(root, root_field))


class SearchFilter(object):
    
    def __init__(self, queryset, search_fields='', search_str=''):
        self.qs = queryset
        self.fields = search_fields
        self.search = search_str

    def _convert_values(self):
        result = []
        values = ast.literal_eval(self.search)
        search_params = [value for item in values for value in item.split()]
        for index in range(1, len(search_params)+1):
            items = []
            for search_param in permutations(search_params, (index)):
                items.append(' '.join(search_param))
            result = [*result, (index, items)]
        return result

    def apply_filter(self):
        querysets = []
        values = self._convert_values()
        for index, field in enumerate(self.fields):
            for relevance, items in values:
                queries = [Q((f'{field}', f'{item}')) for item in items]
                qs = self.qs.annotate(source=V(f'{index}'))\
                    .filter(reduce(lambda field, val: field | val, queries))
                querysets.extend([{'obj': item, 'source': item.source, 'relevance': relevance} for item in qs])

        return querysets
    
    def get_filtered_qs(self, querysets):
        grp_keys = ('obj', 'source')
        sum_keys = ['relevance']
        result = [
            {
                **{grp_key: key[i] for i, grp_key in enumerate(grp_keys)},
                **{skey: sum(sub[skey] for sub in querysets if all(sub[k] == key[i] for i, k in enumerate(grp_keys)))}
            }
            for key in set(tuple(sub[k] for k in grp_keys) for sub in querysets)
            for skey in sum_keys
        ]
        result.sort(key=lambda i: (i['source'], -i['relevance']))

        result_qs = Product.objects.filter(pk__in=[item['obj'].id for item in result])
        return result_qs.annotate(
            custom_order=Case(
                *[When(pk=item['obj'].id, then=pos) for pos, item in enumerate(result)],
                default=len(result),
                output_field=IntegerField(),
            )
        ).order_by('custom_order')


class SizeFilterTree(FilterTree):

    def __init__(self, qs=None):
        self.annotate_field = 'stock'
        super().__init__(qs)

    def __serialize_root(self, root, root_field):
        def get_ident():
            if root[root_field]:
                return '%s_%s' % (root_field, re.sub(r'[^a-zA-Zа-яА-Я0-9]', '', root[root_field]).lower())
            return root_field
        
        return root | {'name': root_field, 'ident': get_ident()}

    def __serialize_node(self, parent, node, node_fields):
        def get_ident(item):
            result = ''
            for node_field in node_fields:
                if not item[node_field]:
                    continue
                result += '%s_%s_%s' % (
                    node_field,
                    re.sub(r'[^a-zA-Zа-яА-Я0-9]', '', parent).lower(),
                    re.sub(r'[^a-zA-Zа-яА-Я0-9]', '', item[node_field]).lower()
                )
            return result
        
        return [element for element in [item | {'name': '_'.join(node_fields), 'ident': get_ident(item)} for item in node] if element['ident']]
    
    def sum(self, root_field, *node_fields, **kwargs):
        if self.qs:
            root_order = kwargs.get('root_order', [])
            node_order = kwargs.get('node_order', [])
            qs = self.qs.values(root_field).annotate(sum=Sum(self.annotate_field))
            if root_order:
                qs = qs.order_by(*root_order)
            for root in qs:
                if not root[root_field]:
                    continue
                if node_fields:
                    node_qs = self.qs.filter(Q((root_field, root[root_field]))).values(*node_fields).annotate(count=Count('id'), sum=Sum('stock'))
                    if node_order:
                        node_qs = node_qs.order_by(*node_order)
                    root['count'] = 0
                    if node_qs:
                        root['nodes'] = self.__serialize_node(root[root_field], node_qs, node_fields)
                        root['count'] = len(root['nodes'])
                            
                root['сategory__group__name'] = root.pop('product__сategory__group__name')
                self.tree.append(self.__serialize_root(root, 'сategory__group__name'))


class CharInFilter(BaseInFilter, CharFilter):
    
    # Оставлено пока для целей отладки фильтров
    def filter(self, qs, value):
        return super().filter(qs, value)


class ProductFilter(django_filters.FilterSet):

    metal                            = CharInFilter(field_name = 'metal', lookup_expr='in')
    metal_finish__name               = CharInFilter(field_name = 'metal_finish__name', lookup_expr='in')
    str_color                        = CharInFilter(field_name = 'str_color', lookup_expr='in')
    metal_content                    = CharInFilter(field_name = 'metal_content', lookup_expr='in')
    brand__name                      = CharInFilter(field_name = 'brand__name', lookup_expr='in')
    сollection__name                 = CharInFilter(field_name = 'сollection__name', lookup_expr='in')
    status                           = CharInFilter(field_name = 'status', lookup_expr='in')
    сategory__group__name            = CharInFilter(field_name = 'сategory__group__name', lookup_expr='in')
    сategory__name                   = CharInFilter(field_name = 'сategory__name', lookup_expr='in')
    gender__name                     = CharInFilter(field_name = 'gender__name', lookup_expr='in')
    in_stock                         = BooleanFilter(method='in_stock_filter')
    product__сategory__group__name   = CharFilter(method='size_filter')    
    size__name                       = CharFilter(method='size_filter')
    # precious_stone__name             = CharFilter(method='gems_filter')
    precious_filter                  = CharFilter(method='gems_filter')
    color_filter                     = CharFilter(method='gems_filter')
    cut_type__cut_type_image__name   = CharFilter(method='cut_type_filter')
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
    stock = django_filters.NumericRangeFilter(
        field_name='stock',
        lookup_expr='range',
        method='stock_filter'
    )
    search_values   = CharFilter(method='search_filter')

    class Meta:
        model = Product
        fields = [
            'metal',
            'str_color',
            'metal_content',
            'status',
        ]
    
    def in_stock_filter(self, queryset, name, value):
        return queryset.filter(
            pk__in=StockAndCost.objects.filter(
                stock__gte=1
            ).values_list('product_id', flat=True)
        )

    def stock_filter(self, queryset, name, value):
        filters = {}
        if value.start:
            filters['total_stock__gte'] = value.start
        if value.stop:
            filters['total_stock__lte'] = value.stop 
        return queryset.filter(
            pk__in=StockAndCost.objects.values('product')
                .annotate(total_stock=Sum('stock'))
                .filter(**filters)
                .values('product')
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
    
    def cut_type_filter(self, queryset, name, value):
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
    

    def search_filter(self, queryset, name, value):
        fields = ['articul__iregex', 'name__iregex', 'сollection__name__iregex', 'mark_description__iregex', 'gem_sets__precious_stone__name']
        search_obj = SearchFilter(queryset.prefetch_related('gem_sets'), fields, value)
        return search_obj.get_filtered_qs(search_obj.apply_filter())
