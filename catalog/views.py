import json
import collections

from django.shortcuts import render
from django.core.paginator import Paginator
from django.core.paginator import EmptyPage
from django.core.paginator import PageNotAnInteger
from django.views.generic import ListView, DetailView, TemplateView
from django.conf import settings
from django.http import JsonResponse
from django.db.models import Value, FloatField, Count, Sum
from django.db.models.functions import Cast
from django.core.serializers import serialize

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated


from .forms import ProductFilterForm
from .filters import FilterTree, ProductFilter
from cart.cart import Cart
from clients.login import Login
from catalog.models import (
    Product, ProductImage, StockAndCost, Price,
    ProductsSet, GemSet, SimilarProducts
)

from .tasks import (
    run_uploading_products,
    run_uploading_images,
    run_uploading_price,
    run_uploading_stock_and_costs
)

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

    def get_filter(self, qs, func, field, *groups):
        filter_tree = FilterTree(qs)
        method = getattr(filter_tree, func)
        method(field, *groups)
        return filter_tree
    
    def get_filters(self, qs):
        return {
            'metals'      : self.get_filter(qs, 'count', 'metal', 'str_color'),
            'metal_finish': self.get_filter(qs.annotate(metal_finish_count=Count('metal_finish')), 'count', 'metal_finish__name'),
            'brands'      : self.get_filter(qs, 'count', 'brand__name'),
            'prod_status' : self.get_filter(qs, 'count', 'status'),
            'collections' : self.get_filter(qs, 'count', 'collection__group__name', 'collection__name'),
            # 'genders'     : self.get_filter(qs.annotate(gender_count=Count('gender')), 'count', 'gender__name'),
            'sizes'       : self.get_filter(StockAndCost.objects.filter(product__in=qs), 'sum', 'product__collection__group__name', 'size__name'),
            'gems'        : self.get_filter(GemSet.objects.filter(product__in=qs), 'count', 'precious_filter'),
            # 'colors'      : self.get_filter(GemSet.objects.filter(product__in=qs), 'count', 'color_filter'),
            # 'cuts'        : self.get_filter(GemSet.objects.filter(product__in=qs), 'count', 'cut_type__cut_type_image__name', 'cut_type__cut_type_image__image'),
        }

    def get_context_data(self, *, object_list=None, **kwargs):
        context = super().get_context_data(**kwargs)
        context['MEDIA_URL'] = settings.MEDIA_URL
        context['filters'] = self.get_filters(Product.objects.get_active_products())

        return context


class ProductView(FiltersView, ListView):
    model = Product
    template_name = 'pages/catalog.html'
    context_object_name = 'products'
    allow_empty, filters, paginate_by = True, [], 72

    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    def post(self, request, *args, **kwargs):
        raw_filters = request.POST.dict()
        self.filters = json.loads(raw_filters.get('filters', '[]'))
        return self.get(request)

    def get_queryset(self):
        if self.filters:
            parsed_filter = parse_filters(self.filters)
            products = Product.objects.get_active_products(parsed_filter.get('in_stock', False))
            filters = self.get_filters(products)

            filtered_products = ProductFilter(parsed_filter, queryset=products)
            products = filtered_products.qs.distinct()

        else:
            products = Product.objects.get_active_products()
            filters = self.get_filters(products)

        return products, json.dumps({key: value.__json__() for key, value in filters.items()})

    def get_context_data(self, *, object_list=None, **kwargs):
        self.object_list = Product.objects.none()
        context = {
            'products': self.object_list,
            'filters': {}, 'is_sized': False,
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

        context = super().get_context_data(**kwargs)
        context['products']    = products_page
        context['filters']     = filters
        context['is_sized']    = StockAndCost.objects.filter(product__in=products_page, size__isnull=False).values_list('product_id', flat=True)
        context['MEDIA_URL']   = settings.MEDIA_URL
        return context


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

    def get_context_data(self, *, object_list=None, **kwargs):
        context = super().get_context_data(**kwargs)
        current_product = self.get_object()
        context['prod_sets']      = ProductsSet.objects.filter(product=current_product)
        context['gem_sets']       = GemSet.objects.filter(product=current_product)
        context['cart']           = json.dumps([
                {**item, 'product': None} 
                for item 
                in list(Cart(self.request)) 
                if item['product']['id'] == current_product.id
        ])
        context['stock_and_cost'] = StockAndCost.objects.filter(
            product=current_product
        ).order_by('size__size_from')
        context['is_sized'] = bool(StockAndCost.objects.filter(
            product=current_product, size__isnull=False
        ))
        context['MEDIA_URL'] = settings.MEDIA_URL
        context['filters']     = ProductFilterForm(
            ['articul', 'status'],
            initial={
                'articul': current_product.articul,
                'status' : current_product.status
            }
        )

        return dict(list(context.items()))


def sizes_selection(request, prod_id):

    if request.method != 'POST':
        cart = list(Cart(request))
        context = StockAndCost.objects.filter(product_id=prod_id).order_by('size__size_from')
        return render(
            request,
            'forms/size_selection.html',
            {
                'stock_and_cost': context,
                'cart': json.dumps([{**item, 'product': None} for item in cart if str(item['product']['id']) == prod_id])
        })


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
    productIds = request.query_params.get('productIds')
    size = request.query_params.get('size')
    if productIds:
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
        ).values('product').annotate(total_stock=Sum('stock')).order_by()

        return JsonResponse(
            {
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
            },
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
    if product_id:
        product_set_imgs = ProductImage.objects.filter(
            product_id__in=ProductsSet.objects.filter(
                product_id=product_id
            ).values_list('accessory', flat=True)
        )

        return JsonResponse(
            {
                'replay'           : 'ok',
                'product_sets' : serialize("json", product_set_imgs)
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
        products = filtered_products.qs.distinct()
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

