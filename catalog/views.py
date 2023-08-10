import json
from django.core.paginator import Paginator
from django.core.paginator import EmptyPage
from django.core.paginator import PageNotAnInteger
from django.views.generic import ListView, DetailView
from django.conf import settings
from django.http import JsonResponse
from django.db.models import Value, FloatField, F, Sum
from django.db.models.functions import Cast
from django.core.serializers import serialize
from django.core.serializers.json import DjangoJSONEncoder

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated


from .forms import ProductFilterForm
from clients.login import Login
from clients.models import PriorityDirection
from catalog.models import (
    Product, ProductImage,
    Collection, StockAndCost, Price,
    ProductsSet, GemSet, SimilarProducts
)

from .tasks import (
    run_uploading_products,
    run_uploading_images,
    run_uploading_price,
    run_uploading_stock_and_costs
)


class ProductView(ListView):
    model = Product
    template_name = 'pages/products.html'
    context_object_name = 'products'
    allow_empty = True
    filters = {}
    paginate_by = 20

    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    def post(self, request, *args, **kwargs):
        self.filters = json.loads(request.POST['data'])
        return self.get(request)

    def get_queryset(self):
        products = Product.objects.filter(product_type='product')
        product_ids = list(products.values_list('pk', flat=True))
        if self.filters:
            brands = [brand.replace('brand-', '') for brand in \
                      self.filters.get('brand') if 'brand-' in brand]
            if brands:
                products = products.exclude(brand_id__in=brands)
            collections = [collection.replace('collection-', '') for collection in \
                           self.filters.get('collection') if 'collection-' in collection]
            if collections:
                products = products.exclude(collection_id__in=collections)
            products = products.apply_filters(self.filters)
            
            stock_and_cost = StockAndCost.objects.all()
            if self.filters.get('size'):
                stock_and_cost = stock_and_cost.filter(size__exact=self.filters['size'])
                if self.filters.get('weight'):
                    stock_and_cost = stock_and_cost.filter(weight__gte=self.filters['weight'])
                if self.filters.get('weight_till'):
                    stock_and_cost = stock_and_cost.filter(weight__lte=self.filters['weight_till'])
            else:
                stock_and_cost = stock_and_cost.default_stocks_and_costs(product_ids)
                stock_and_cost = stock_and_cost | StockAndCost.objects.filter(
                    product_id__in=
                        set(product_ids)-set(
                            stock_and_cost.values_list('product_id', flat=True)
                ))
                if self.filters.get('weight'):
                    stock_and_cost = stock_and_cost.filter(weight__gte=self.filters['weight'])
                if self.filters.get('weight_till'):
                    stock_and_cost = stock_and_cost.filter(weight__lte=self.filters['weight_till'])
            
            if stock_and_cost: 
                products = products.filter(pk__in=stock_and_cost.values_list('product_id', flat=True))
        
            if self.filters.get('price') or self.filters.get('price_till'):
                prices = Price.objects.available_prices(product_ids)
                if self.filters.get('price'):
                    prices = prices.filter(price__gte=self.filters['price'])
                if self.filters.get('price_till'):
                    prices = prices.filter(price__lte=self.filters['price_till'])

                products = products.filter(pk__in=prices.values_list('product_id', flat=True))

        return products

    def get_context_data(self, *, object_list=None, **kwargs):
        context = super().get_context_data(**kwargs)

        paginator = Paginator(context['products'], self.paginate_by)
        page = self.request.GET.get('page')

        try:
            products_page = paginator.page(page)
        except PageNotAnInteger:
            products_page = paginator.page(1)
        except EmptyPage:
            products_page = paginator.page(paginator.num_pages)

        collections = Collection.objects.all().annotate(group_name=F('group__name')).values('id', 'name', 'group_name')

        context['products']    = products_page
        context['brands']      = serialize("json", PriorityDirection.objects.all())
        context['collections'] = json.dumps(list(collections), ensure_ascii=False)
        context['MEDIA_URL']   = settings.MEDIA_URL
        context['filters']     = ProductFilterForm()
        return dict(list(context.items()))


class CertificateView(ListView):
    model = Product
    template_name = 'pages/сertificate.html'
    context_object_name = 'сertificates'
    allow_empty = True
    filters = {}
    paginate_by = 20

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
    filters = {}
    paginate_by = 20

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
        context['prod_sets'] = ProductsSet.objects.filter(product=current_product)
        context['gem_sets']  = GemSet.objects.filter(product=current_product)
        context['MEDIA_URL'] = settings.MEDIA_URL
        context['filters']     = ProductFilterForm(
            ['articul', 'status'],
            initial={
                'articul': current_product.articul,
                'status' : current_product.status
            }
        )
        return dict(list(context.items()))


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

        return JsonResponse(
            {
                'replay'           : 'ok',
                'products'         : serialize("json", products),
                'stocks_and_costs' : serialize("json", stocks_and_costs),
                'actual_prices'    : serialize("json", prices),
                'discount_prices'  : serialize("json", discount_prices),
                'default_sizes'    : serialize("json", stocks_and_costs_with_default_size),
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
        product_analogues_imgs = ProductImage.objects.filter(
            product_id__in=SimilarProducts.objects.filter(
                product_id=product_id
            ).values_list('similar_product', flat=True)
        )

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
