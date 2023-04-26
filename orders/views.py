import json
from django.shortcuts import render, get_object_or_404

from django.views.generic import ListView, UpdateView, CreateView, DetailView
from django.conf import settings

from .forms import ProductForm
from .models import (
    Product,
    Collection,
    PriorityDirection,
    ProductImage
)


class ProductView(ListView):
    model = Product
    template_name = 'pages/product.html'
    context_object_name = 'products'
    allow_empty = True
    filters = {}

    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    def post(self, request, *args, **kwargs):
        self.filters = json.loads(request.POST['data'])
        return self.get(request)

    def get_queryset(self):
        products = Product.objects.filter(product_type='product')
        if self.filters:
            brands = self.filters.get('brand')
            if brands:
                products = products.exclude(brand_id__in=brands)
            collections = self.filters.get('collection')
            if collections:
                products = products.exclude(collection_id__in=collections)   

        return products

    def get_context_data(self, *, object_list=None, **kwargs):
        context = super().get_context_data(**kwargs)
        context['collections'] = Collection.objects.all().values()
        context['brands'] = PriorityDirection.objects.all().values()
        context['MEDIA_URL'] = settings.MEDIA_URL
        return dict(list(context.items()))
    

class CertificateView(ListView):
    model = Product
    template_name = 'pages/сertificate.html'
    context_object_name = 'сertificates'
    allow_empty = True
    filters = {}

    def get_queryset(self):
        return Product.objects.filter(product_type='gift_сertificate')

    def get_context_data(self, *, object_list=None, **kwargs):
        context = super().get_context_data(**kwargs)
        context['MEDIA_URL'] = settings.MEDIA_URL
        return dict(list(context.items()))
    

class ServiceView(ListView):
    model = Product
    template_name = 'pages/service.html'
    context_object_name = 'services'
    allow_empty = True
    filters = {}

    def get_queryset(self):
        return Product.objects.filter(product_type='service')

    def get_context_data(self, *, object_list=None, **kwargs):
        context = super().get_context_data(**kwargs)
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
        context['MEDIA_URL'] = settings.MEDIA_URL
        return dict(list(context.items()))
