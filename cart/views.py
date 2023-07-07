from django.http import JsonResponse
from django.shortcuts import render, redirect, get_object_or_404
from django.views.decorators.http import require_POST
from django.db import transaction
from django.core.exceptions import ValidationError
import simplejson as json

from clients.login import Login
from catalog.models import Product
from .cart import Cart
from .forms import (
    CartAddProductForm, OrderForm, OrderItemForm
)

from django.conf import settings


@require_POST
def cart_add(request, product_id=-1):
    cart = Cart(request)
    product = get_object_or_404(Product, id=product_id)
    form = CartAddProductForm(request.POST)

    if form.is_valid():
        selected_prod_params = form.cleaned_data
        cart.add(product, **selected_prod_params)

    return redirect('cart:cart_detail')


@require_POST
def send_to_cart(request, product_id=-1):
    cart = Cart(request)
    product = get_object_or_404(Product, id=product_id)
    form = CartAddProductForm(request.POST)

    if form.is_valid():
        selected_prod_params = form.cleaned_data
        cart.add(product, **selected_prod_params)
        return JsonResponse({'reply': 'ok'})
    
    return JsonResponse({'reply': '-', 'errors': form.errors})


def cart_remove(request, product_id, size):
    cart = Cart(request)
    cart.remove(product_id, size=size)
    return redirect('cart:cart_detail')


def cart_detail(request):
    cart = Cart(request)
    return render(request, 'pages/cart.html', {'cart': cart, 'MEDIA_URL': settings.MEDIA_URL})


def cart_detail_with_errors(request):
    cart = Cart(request, True)
    return render(request, 'pages/cart.html', {'cart': cart, 'MEDIA_URL': settings.MEDIA_URL})


@require_POST
def order_create(request):
    cart = Cart(request)
    login = Login(request)

    clients = login.get_clients()
    managers = login.get_managers()

    order_form = OrderForm({
        'client': clients.first(),
        'manager': managers.first(),
        'status': 'introductory'
    })
    order_instance = order_form.save(commit=False)

    order_items = [{
        key: Product.objects.get(pk=val['id']) if key=='product' else val \
            for key, val in item.items()
    } for item in cart]

    formset, errors = [], []
    try:

        with transaction.atomic():
            for item in order_items:
                formset.append(OrderItemForm(
                    item | {
                        'sum': item['total_price']
                }))

                if order_form.is_valid():
                    order_instance.save()  

                for form in formset:  
                    if not form.is_valid():
                        errors.append({
                            'product_id': item['product'].id,
                            'size': item['size'],
                            'error': form.errors.as_text()
                        })
                        continue
                    item_instance = form.save(commit=False)
                    item_instance.order = order_instance
                    item_instance.save()

            if errors:
                raise ValidationError(json.dumps(errors))

    except ValidationError as errors:
        transaction.rollback()
        for error in json.loads(errors.message):
            cart.add_error(
                error['product_id'],
                error['error'],
                size=error['size']
            )
        return redirect('cart:errors')
    
    finally:
        if transaction.get_autocommit():
            transaction.commit()

    cart.clear()
    return redirect('orders:orders')
