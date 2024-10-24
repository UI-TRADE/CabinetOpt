import json
import collections
import logging

from contextlib import suppress
from django.shortcuts import render
from django.core import management
from django.core.paginator import Paginator
from django.core.paginator import EmptyPage
from django.core.paginator import PageNotAnInteger
from django.views.generic import ListView, DetailView, TemplateView
from django.conf import settings
from django.http import JsonResponse
from django.db.models import Value, FloatField, Count, Sum, Min
from django.db.models.functions import Cast
from django.core.serializers import serialize

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated


from .forms import ProductFilterForm
from .filters import FilterTree, SizeFilterTree, ProductFilter
from cart.cart import Cart
from clients.login import Login
from catalog.models import (
    Product,
    ProductImage,
    StockAndCost,
    GemSet,
    SimilarProducts
)

from settings_and_conditions.models import CatalogFilter, Banner
from utils.caching import use_cache


from .tasks import (
    run_uploading_products,
    run_uploading_images,
    run_uploading_price,
    run_uploading_stock_and_costs
)

from utils.requests import handle_get_params, handle_post_params

logger = logging.getLogger(__name__)


def parse_filters(filters):
    result = collections.defaultdict(list)
    range_filters = {}
    for item in filters:
        for key, value in item.items():
            if not value:
                continue
            if not isinstance(value, str):
                range_filters = range_filters | {key: value}
                continue
            result[key].append(value)
    result = {key: ','.join(value) for key, value in result.items()}
    if range_filters:
        result = result | range_filters
    return result


class FiltersView(TemplateView):
    template_name = 'forms/catalog-filters.html'

    def get_filter(self, qs=None, func='', field='', *groups, **kwargs):
        if qs:
            if 'size__name' in groups:
                filter_tree = SizeFilterTree(qs)
            else:   
                filter_tree = FilterTree(qs)
            method = getattr(filter_tree, func)
            method(field, *groups, **kwargs)
            return filter_tree
        return FilterTree()
    
    def get_filters(self, qs):
        filters, hide_count_of_products = dict(), False
        with suppress(CatalogFilter.DoesNotExist):
            filter_settings = CatalogFilter.objects.get()
            if filter_settings.metals:
                filters['metals'] = self.get_filter(qs, 'count', 'metal', 'str_color')
            if filter_settings.metal_finish:
                filters['metal_finish'] = self.get_filter(
                    qs.annotate(metal_finish_count=Count('metal_finish')),
                    'count', 'metal_finish__name'
                )
            if filter_settings.brands:
                filters['brands'] = self.get_filter(qs, 'count', 'brand__name')
            if filter_settings.prod_status:
                filters['prod_status'] = self.get_filter(qs, 'count', 'status')
            if filter_settings.сategories:
                filters['сategories'] = self.get_filter(
                    qs, 'count', 'сategory__group__name', 'сategory__name',
                    root_order=['сategory__group__order']
                )
            if filter_settings.genders:
                filters['genders'] = self.get_filter(
                    qs.annotate(gender_count=Count('gender')), 'count', 'gender__name'
                )
            if filter_settings.sizes:
                filters['sizes'] = self.get_filter(
                    StockAndCost.objects.filter(product__in=qs),
                    'sum', 'product__сategory__group__name', 'size__name',
                    node_order=['size__size_from']
                )
            if filter_settings.gems:
                filters['gems'] = self.get_filter(
                    GemSet.objects.filter(product__in=qs), 'count', 'precious_filter'
                )
            if filter_settings.colors:
                filters['colors'] = self.get_filter(
                    GemSet.objects.filter(product__in=qs), 'count', 'color_filter'
                )
            if filter_settings.cuts:
                filters['cuts'] = self.get_filter(
                    GemSet.objects.filter(product__in=qs),
                    'count', 'cut_type__cut_type_image__name', 'cut_type__cut_type_image__image'
                )
            if filter_settings.weight_range:
                filters['weight-range'] = self.get_filter()
            if filter_settings.quantity_range:
                filters['quantity-range'] = self.get_filter()
            if filter_settings.instok_range:
                filters['instok-range'] = self.get_filter()
            if filter_settings.price_range:
                filters['price-range'] = self.get_filter()

            filters['сollections'] = self.get_filter(qs, 'count', 'сollection__name')
            hide_count_of_products = filter_settings.hide_count_of_products

        return filters, hide_count_of_products

    def get_context_data(self, *, object_list=None, **kwargs):
        with use_cache('active_products', {'in_stock': False}, 60*30) as cache_handler:
            if cache_handler.cache is None:
                cache_handler.cache = Product.objects.get_active_products(False)
        products = cache_handler.cache
        context = super().get_context_data(**kwargs)
        context['MEDIA_URL'] = settings.MEDIA_URL
        context['filters'], context['hide_count_of_products'] = \
            self.get_filters(products)

        return context


class ProductView(FiltersView, ListView):
    model = Product
    template_name = 'pages/catalog.html'
    context_object_name = 'products'
    allow_empty, filters, sorting, paginate_by = True, [], {}, 72

    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    @handle_post_params()
    def post(self, request, *args, **kwargs):
        filters_and_sorting = request.POST.dict()
        self.filters = json.loads(filters_and_sorting.get('filters', '[]'))
        self.sorting = json.loads(filters_and_sorting.get('sorting', '{ }'))
        return self.get(request, *args, **kwargs)

    def apply_sorting(self, products):
        if not self.sorting:
            return
        
        result = products

        sorting_fields = []
        sort_by_articul = self.sorting.get('articul', '')
        if sort_by_articul:
            sorting_fields.append(
                'articul' if sort_by_articul == 'asc' else '-articul'
            )
        sort_by_stock = self.sorting.get('stock', '')
        if sort_by_stock:
            sorting_fields.append(
                'total_stock' if sort_by_stock == 'asc' else '-total_stock'
            )
        sort_by_weight = self.sorting.get('weight', '')
        if sort_by_weight:
            sorting_fields.append(
                'average_weight' if sort_by_weight == 'asc' else '-average_weight'
            )

        if not sorting_fields:
            return result

        result = products.prefetch_related('stocks_and_costs').annotate(
            total_stock=Sum('stocks_and_costs__stock'),
            average_weight=Sum('stocks_and_costs__weight') / Count('stocks_and_costs__id')   
        ).distinct().order_by(*sorting_fields)
    
        return result
   
    def get_queryset(self):
        if self.filters:
            parsed_filter = parse_filters(self.filters)
            in_stock = parsed_filter.get('in_stock', False)
            with use_cache('active_products', {'in_stock': in_stock}, 60*30) as cache_handler:
                if cache_handler.cache is None:
                    cache_handler.cache = Product.objects.get_active_products(in_stock)
            products = cache_handler.cache

            with use_cache('filters', {'in_stock': in_stock}, 60*30) as cache_handler:
                if cache_handler.cache is None:
                    cache_handler.cache, _ = self.get_filters(products)
            filters = cache_handler.cache

            with use_cache('product_filters', self.filters, 60*30) as cache_handler:
                if cache_handler.cache is None:
                    filtered_products = ProductFilter(parsed_filter, queryset=products)
                    cache_handler.cache = filtered_products.qs
            products = cache_handler.cache

        else:
            with use_cache('active_products', {'in_stock': True}, 60*30) as cache_handler:
                if cache_handler.cache is None:
                    cache_handler.cache = Product.objects.get_active_products()
            products = cache_handler.cache

            with use_cache('filters', {'in_stock': True}, 60*30) as cache_handler:
                if cache_handler.cache is None:
                    cache_handler.cache, _ = self.get_filters(products)
            filters = cache_handler.cache

        if self.sorting:
            products = self.apply_sorting(products)

        return products, json.dumps({key: value.to_json() for key, value in filters.items()})

    def get_context_data(self, *, object_list=None, **kwargs):
        self.object_list = Product.objects.none()
        context = {
            'products': self.object_list,
            'filters': {},
            'is_sized': False,
            'cart': [],
            'banners': [],
            'share_link': kwargs.get('link', ''),
            'MEDIA_URL': settings.MEDIA_URL
        }
        ''' 
        Для get запроса возвращаем пустой набор,
        ибо получение данных реализованно только на POST
        '''
        if self.request.method == 'GET':
            return context
    
        self.object_list, filters = self.get_queryset()
        paginator = Paginator(self.object_list, self.paginate_by)
        page = self.request.GET.get('page')

        try: 
            products_page = paginator.page(page)
        except PageNotAnInteger:
            products_page = paginator.page(1)
        except EmptyPage:
            products_page = paginator.page(paginator.num_pages)

        with use_cache('products', 'is_sized', 60*1440) as cache_handler:
            if cache_handler.cache is None:
                cache_handler.cache = StockAndCost.objects.filter(
                    # product__in=products_page,
                    size__isnull=False
                ).values_list('product_id', flat=True)
        is_sized = cache_handler.cache


        cart = [
            {
                key: value['id'] if key == 'product' else value \
                for key, value in cart_el.items() \
                if key in ['product', 'size', 'quantity']
            } for cart_el in Cart(self.request)
        ]

        context = super().get_context_data(**kwargs)
        return context | {
            'products': products_page,
            'filters': filters,
            'is_sized': is_sized,
            'cart': cart,
            'banners': Banner.objects.get_active_banners(),
            'share_link': kwargs.get('link', ''),
            'MEDIA_URL': settings.MEDIA_URL
        }


class CertificateView(ListView):
    model = Product
    template_name = 'pages/сertificate.html'
    context_object_name = 'сertificates'
    allow_empty = True
    paginate_by = 72

    def get_queryset(self):
        return Product.objects.filter(product_type='gift_сertificate')

    def get_context_data(self, *, object_list=None, **kwargs):
        context = super().get_context_data(**kwargs)

        paginator = Paginator(context['сertificates'], self.paginate_by)
        page = self.request.GET.get('page')
        
        try:
            сertificates_page = paginator.page(page)
        except PageNotAnInteger:
            сertificates_page = paginator.page(1)
        except EmptyPage:
            сertificates_page = paginator.page(paginator.num_pages)
        
        context['сertificates'] = сertificates_page
        context['MEDIA_URL'] = settings.MEDIA_URL
        return dict(list(context.items()))
    

class ServiceView(ListView):
    model = Product
    template_name = 'pages/service.html'
    context_object_name = 'services'
    allow_empty = True
    paginate_by = 72

    def get_queryset(self):
        return Product.objects.filter(product_type='service')

    def get_context_data(self, *, object_list=None, **kwargs):
        context = super().get_context_data(**kwargs)

        paginator = Paginator(context['services'], self.paginate_by)
        page = self.request.GET.get('page')
        
        try:
            services_page = paginator.page(page)
        except PageNotAnInteger:
            services_page = paginator.page(1)
        except EmptyPage:
            services_page = paginator.page(paginator.num_pages)
        
        context['services'] = services_page
        context['MEDIA_URL'] = settings.MEDIA_URL
        return dict(list(context.items()))


class ProductCardView(DetailView):
    model = Product
    template_name = 'pages/product.html'
    slug_url_kwarg = 'prod_id'
    slug_field = 'pk'
    context_object_name = 'product'

    @handle_get_params()
    def get(self, request, *args, **kwargs):
        self.share_link = kwargs.get('link', '')
        return super().get(request, *args, **kwargs)

    def get_context_data(self, *, object_list=None, **kwargs):
        context = super().get_context_data(**kwargs)
        current_product = self.get_object()
        return context | {
            'gem_sets': GemSet.objects.filter(product=current_product),
            'cart': json.dumps([
                    {**item, 'product': None} 
                    for item 
                    in list(Cart(self.request)) 
                    if item['product']['id'] == current_product.id
                ]),
            'stock_and_cost': StockAndCost.objects.filter(
                    product=current_product
                ).order_by('size__size_from'),
            'is_sized': bool(StockAndCost.objects.filter(
                    product=current_product, size__isnull=False
                )),
            'filters': ProductFilterForm(
                    ['articul', 'status'],
                    initial={
                        'articul': current_product.articul,
                        'status' : current_product.status
                    }
                ),
            'share_link' : self.share_link,
            'MEDIA_URL': settings.MEDIA_URL
        }


def sizes_selection(request, prod_id):

    if request.method != 'POST':
        cart = list(Cart(request))
        context = StockAndCost.objects.filter(product_id=prod_id).order_by('size__size_from')
        try:
            return render(
                request,
                'forms/size_selection.html',
                {
                    'stock_and_cost': context,
                    'cart': json.dumps([{**item, 'product': None} for item in cart if str(item['product']['id']) == prod_id])
            })
        except KeyError as error:
            logger.error(f'{error}: {[{**item,} for item in cart]}')
            return render(
                request,
                'forms/size_selection.html',
                {
                    'stock_and_cost': context,
                    'cart': json.dumps([])
            })
    

def search_error(request):
    search_values = request.GET.get('search_values')
    return render(
        request,
        'pages/search-error.html',
        {'search_values': search_values}
    )



@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_products(request):
    errors = run_uploading_products(request.data)
    if errors:
        return JsonResponse(
            errors,
            status=200,
            safe=False,
            json_dumps_params={'ensure_ascii': False}
        )
    return JsonResponse({'replay': 'ok'}, status=200)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_images(request):
    run_uploading_images(request.data)
    return JsonResponse({'replay': 'ok'}, status=200)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def remove_images(request, prod_id):
    with suppress(Product.DoesNotExist):
        product = Product.objects.get(identifier_1C=prod_id)
        ProductImage.objects.filter(product=product).delete()
        return JsonResponse({'replay': 'ok'}, status=200)
    
    return JsonResponse(
        {'uuid':prod_id, 'error': 'Не найдена номенклатура'},
        status=200,
        safe=False,
        json_dumps_params={'ensure_ascii': False}
    )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_price(request):
    errors = run_uploading_price(request.data)
    if errors:
        return JsonResponse(
            errors,
            status=200,
            safe=False,
            json_dumps_params={'ensure_ascii': False}
        )
    return JsonResponse({'replay': 'ok'}, status=200)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_stock_and_costs(request):
    errors = run_uploading_stock_and_costs(request.data)
    if errors:
        return JsonResponse(
            errors,
            status=200,
            safe=False,
            json_dumps_params={'ensure_ascii': False}
        )
    return JsonResponse({'replay': 'ok'}, status=200)


@api_view(['GET'])
def pickup_products(request):
    search_string = request.query_params.get('searchString')
    if search_string:
        results = serialize("json", Product.objects.filter(
            articul__icontains=search_string
        ).annotate(
            relevance=Cast(Value(1), output_field=FloatField())
        ).order_by('-relevance')[:5])
    return JsonResponse(
        {'replay': 'ok', 'data': results},
        status=200,
        safe=False,
        json_dumps_params={'ensure_ascii': False}
    )


@api_view(['GET'])
def stocks_and_costs(request):

    def get_serialized_stocks_and_costs():
        _, products, stocks_and_costs, prices, discount_prices = \
            StockAndCost.objects.available_stocks_and_costs(
                productIds.split(','),
                size=size,
                clients=Login(request).get_clients()
            )

        stocks_and_costs_with_default_size = StockAndCost.objects.default_stocks_and_costs(
            products.values_list('pk', flat=True), size=size
        )

        available_stocks = StockAndCost.objects.filter(
            product_id__in = productIds.split(',')
        ).values('product').annotate(total_stock=Sum('stock')).order_by('product')

        return {
            'replay'           : 'ok',
            'products'         : serialize("json", products),
            'stocks_and_costs' : serialize(
                "json", stocks_and_costs, use_natural_foreign_keys=True
            ),
            'actual_prices'    : serialize("json", prices),
            'discount_prices'  : serialize("json", discount_prices),
            'default_sizes'    : serialize(
                "json", stocks_and_costs_with_default_size, use_natural_foreign_keys=True
            ),
            'available_stocks' : json.dumps([item for item in available_stocks])
        }

    productIds = request.query_params.get('productIds')
    size = request.query_params.get('size')

    if productIds:
        ids = sorted(productIds.split(","))
        with use_cache(
            'stocks_and_costs',
            dict(zip([i for i in range(len(ids))], ids)),
            60*30
        ) as cache_handler:
            if cache_handler.cache is None:
                cache_handler.cache = get_serialized_stocks_and_costs()
        cached_data = cache_handler.cache

        return JsonResponse(
            cached_data,
            status=200,
            safe=False
        )

    return JsonResponse(
        {'replay': 'error', 'message': 'Отсутствуют Продукты для получения данных'},
        status=200
    )


@api_view(['GET'])
def product_accessories(request):
    product_id = request.query_params.get('productId')
    with suppress(Product.DoesNotExist):
        current_product = Product.objects.get(pk=product_id)   
        product_set_imgs = ProductImage.objects.filter(
            product__articul__regex=f'[\d]{current_product.articul[2:]}'
        ).exclude(product=current_product)
        product_set_distinct_imgs = ProductImage.objects.filter(
            pk__in=product_set_imgs\
                .values('product')\
                .annotate(min_id=Min('id'))\
                .values_list('min_id', flat=True)
        )

        return JsonResponse(
            {
                'replay'           : 'ok',
                'product_sets' : serialize("json", product_set_distinct_imgs)
            },
            status=200,
            safe=False
        )

    return JsonResponse(
        {'replay': 'error', 'message': 'Отсутствуют Продукты для получения данных'},
        status=200
    )


@api_view(['GET'])
def product_analogues(request):
    product_id = request.query_params.get('productId')
    if product_id:
        product_analogues_imgs = []
        similar_products = SimilarProducts.objects.filter(product_id=product_id).values_list('similar_product', flat=True)
        for similar_product in similar_products:
            product_analogues_imgs.append(ProductImage.objects.filter(product_id=similar_product).first())
        return JsonResponse(
            {
                'replay'            : 'ok',
                'product_analogues' : serialize("json", product_analogues_imgs)
            },
            status=200,
            safe=False
        )

    return JsonResponse(
        {'replay': 'error', 'message': 'Отсутствуют Продукты для получения данных'},
        status=200
    )


@api_view(['POST'])
def catalog_pages_count(request):
    raw_filters = request.POST.dict()
    filters = json.loads(raw_filters.get('filters', '[]'))
    if filters:
        parsed_filter = parse_filters(filters)
        products = Product.objects.get_active_products(parsed_filter.get('in_stock', False))
        filtered_products = ProductFilter(parsed_filter, queryset=products)
        products = filtered_products.qs
    else:
        products = Product.objects.get_active_products()

    paginator = Paginator(products, 72)
    return JsonResponse(
        {
            'replay'      : 'ok',
            'pages_count' : paginator.num_pages
        },
        status=200,
        safe=False
    )

