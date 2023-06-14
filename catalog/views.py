import json
from contextlib import suppress
from django.core.paginator import Paginator
from django.core.paginator import EmptyPage
from django.core.paginator import PageNotAnInteger
from django.views.generic import ListView, DetailView
from django.conf import settings
from django.http import JsonResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated

from clients.login import Login
from clients.models import Client, PriorityDirection
from catalog.models import Product, Collection
from catalog.models import PriceType, Price

from .tasks import run_uploading_products, run_uploading_images, run_uploading_price
from .tree import get_tree

class ProductView(ListView):
    model = Product
    template_name = 'pages/product.html'
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
        if self.filters:
            brands = [brand.replace('brand-', '') for brand in \
                      self.filters.get('brand') if 'brand-' in brand]
            if brands:
                products = products.exclude(brand_id__in=brands)
            collections = [collection.replace('collection-', '') for collection in \
                           self.filters.get('collection') if 'collection-' in collection]
            if collections:
                products = products.exclude(collection_id__in=collections)

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

        actual_prices = []
        current_clients = Login(self.request).get_clients()
        with suppress(Client.DoesNotExist, PriceType.DoesNotExist, AttributeError):
            actual_prices = Price.objects.available_prices(
                products_page.object_list.values_list('id', flat=True),
                PriceType.objects.get(client = current_clients.get())
            )

        context['products'] = products_page
        context['prices'] = actual_prices
        context['MEDIA_URL'] = settings.MEDIA_URL
        context['jsonBrands'] = json.dumps(
            [{
                'id': obj.id,
                'name': obj.name
            } for obj in PriorityDirection.objects.all()]
        )
        context['jsonCollections'] = get_tree(
            [{
                'id': obj.id,
                'name': obj.name
            } for obj in Collection.objects.all()]
        )

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
    template_name = 'pages/product-card.html'
    slug_url_kwarg = 'prod_id'
    slug_field = 'pk'
    context_object_name = 'prod'

    def get_context_data(self, *, object_list=None, **kwargs):
        context = super().get_context_data(**kwargs)

        actual_prices = []
        current_clients = Login(self.request).get_clients()
        with suppress(Client.DoesNotExist, PriceType.DoesNotExist):
            actual_prices = Price.objects.available_prices(
                [self.kwargs['prod_id']],
                PriceType.objects.get(client = current_clients.get())
            )

        context['prices'] = actual_prices
        context['MEDIA_URL'] = settings.MEDIA_URL
        return dict(list(context.items()))


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_products(request):
    errors = run_uploading_products(request.data)
    if errors:
        return JsonResponse(json.dumps(errors), status=200, safe=False)
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
        return JsonResponse(json.dumps(errors), status=200, safe=False)
    return JsonResponse({'replay': 'ok'}, status=200)
