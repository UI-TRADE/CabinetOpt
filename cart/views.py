from django.http import JsonResponse
from django.shortcuts import render, redirect, get_object_or_404
from django.views.decorators.http import require_POST
from django.core.exceptions import ValidationError
import simplejson as json

from clients.login import Login
from catalog.models import Product
from .cart import Cart
from .forms import CartAddProductForm
from orders.views import save_order

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
        return JsonResponse(
            {'reply': 'ok', 'pk': product_id} | cart.info(
                product_id, size=selected_prod_params['size']
            ),
            safe=False
        )
    
    return JsonResponse({'reply': 'error', 'message': form.errors})


def cart_info(request, product_id, size):
    cart = Cart(request)
    return JsonResponse(cart.info(product_id, size=size), safe=False)


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
def add_order(request):
    cart = Cart(request)
    login = Login(request)

    clients = login.get_clients()
    managers = login.get_managers()

    order_items = [{
        key: Product.objects.get(pk=val['id']) if key=='product' else val \
            for key, val in item.items()
    } for item in cart]

    for item in order_items:
        if (item['weight']):
            item['weight'] = round(item['quantity'] * item['weight'], 3)

    try:
        save_order(
            {
                'client': clients.first(),
                'manager': managers.first(),
                'status': 'introductory'
            },
            order_items
        )

    except ValidationError as errors:
        for error in json.loads(errors.message):
            cart.add_error(
                error['product_id'],
                error['error'],
                size=error['size']
            )
        return redirect('cart:errors')
    
    cart.clear()
    return redirect('orders:orders')
