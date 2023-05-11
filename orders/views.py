import json

from django.db import transaction
from django.core.paginator import Paginator
from django.core.paginator import EmptyPage
from django.core.paginator import PageNotAnInteger
from django.shortcuts import render, redirect, get_object_or_404
from django.urls import reverse_lazy
from django.views.generic import ListView, UpdateView, DetailView, CreateView
from django.conf import settings
from django.core.exceptions import ValidationError
from rest_framework.decorators import api_view
from django.http import JsonResponse

from clients.login import Login

from .models import (
    Product,
    Collection,
    PriorityDirection,
    Price,
    Order,
    OrderItem,
)

from .forms import OrderItemInline
from .tasks import run_uploading_products, run_uploading_images


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
            brands = self.filters.get('brand')
            if brands:
                products = products.exclude(brand_id__in=brands)
            collections = self.filters.get('collection')
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

        actual_prices = Price.objects.available_prices(
            products_page.object_list.values_list('id', flat=True)
        )

        context['products'] = products_page
        context['prices'] = actual_prices
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
        context['MEDIA_URL'] = settings.MEDIA_URL
        return dict(list(context.items()))


class OrderView(ListView):
    model = Order
    template_name = 'pages/orders.html'
    context_object_name = 'orders'
    allow_empty = True

    def get_queryset(self):
        login = Login(self.request)
        return Order.objects.filter(
            client__in=login.get_clients()
        )

    def get_context_data(self, *, object_list=None, **kwargs):
        context = super().get_context_data(**kwargs)
        return dict(list(context.items()))


class UpdateOrderView(UpdateView):
    model = Order
    slug_url_kwarg, slug_field = 'order_id', 'pk'
    template_name = 'pages/order.html'
    success_url = reverse_lazy('orders')
    fields = ['status', 'client', 'manager',]

    def get_form(self):
        form = super().get_form()
        for field in form.fields:
            form.fields[field].widget.attrs['class'] = 'form-control'
        return form

    def get_context_data(self, *, object_list=None, **kwargs):
        context = super().get_context_data(**kwargs)
        if self.request.POST:
            context['order_items'] = OrderItemInline(self.request.POST, instance=self.object)
        else:
            context['order_items'] = OrderItemInline(instance=self.object)   
        return context

    def form_valid(self, form):
        context = self.get_context_data()
        order_items = context['order_items']
        if form.is_valid() and order_items.is_valid():
            print(order_items.cleaned_data)
            with transaction.atomic():
                form.instance.save()
                for order_item in order_items:
                    order_item.save()

            return redirect('orders:orders')

        return render(self.request, self.template_name, context)


def remove_order(request, order_id):

    instance = get_object_or_404(Order,id=order_id)
    instance.delete()

    return redirect('orders:orders')


class CreateOrderView(CreateView):
    model = Order
    template_name = 'pages/order.html'
    success_url = reverse_lazy('orders')
    fields = ['status', 'client', 'manager',]
    
    def get_form(self):
        form = super().get_form()
        for field in form.fields:
            form.fields[field].widget.attrs['class'] = 'form-control'
        return form

    def get_initial(self):
        initial = super().get_initial()
        order = get_object_or_404(Order, id=self.kwargs['order_id'])
        initial['client'] = order.client
        initial['manager'] = order.manager
        return initial

    def get_context_data(self, *, object_list=None, **kwargs):
        context = super().get_context_data(**kwargs)
        order_items = self.get_initial_data()
        if self.request.POST:
            context['order_items'] = OrderItemInline(self.request.POST)
        else:
            context['order_items'] = OrderItemInline(initial=order_items)
        context['order_items'].extra = len(order_items)
        return context
    
    def form_valid(self, form):
        context = self.get_context_data()
        order_items = context['order_items']
        try:

            with transaction.atomic():
                order_instance = form.save(commit=False)
                
                if not form.is_valid():
                    raise ValidationError(form.errors.as_text())    
                order_instance.save()

                for order_item in order_items:
                    if not order_item.is_valid():
                        raise ValidationError(order_item.errors.as_text())
                    
                    item_instance = order_item.save(commit=False)
                    item_instance.order = order_instance
                    item_instance.save()

        except ValidationError as error:
            transaction.rollback()
            context['errors'] = error.message
            return render(self.request, self.template_name, context)
        
        finally:
            if transaction.get_autocommit():
                transaction.commit()

        return redirect('orders:orders')

    
    def get_initial_data(self):
        order_items = list(OrderItem.objects.filter(order_id=self.kwargs['order_id']).values())
        for order_item in order_items:
            order_item['product'] = get_object_or_404(Product, id=order_item['product_id'])
            order_item = {
                key: value for key, value in order_item.items() if key not in [
                    'id','order_id'
            ]}

        return order_items


@api_view(['POST'])
def upload_products(request):
    # curl -X POST -H "Content-Type: application/json" -d @media/test.json http://127.0.0.1:8000/orders/upload/products
    errors = run_uploading_products(request.data)
    if errors:
        return JsonResponse(errors, status=200, safe=False)
    return JsonResponse({'replay': 'ok'}, status=200)


@api_view(['POST'])
def upload_images(request):
    # curl -X POST -H "Content-Type: application/json" -d @media/imgs.json http://127.0.0.1:8000/orders/upload/images
    run_uploading_images(request.data)
    return JsonResponse({'replay': 'ok'}, status=200)
