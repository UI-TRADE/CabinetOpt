from django.shortcuts import render, redirect, get_object_or_404
from django.views.decorators.http import require_POST
from django.db import transaction
from django.core.exceptions import ValidationError

from clients.login import Login
from orders.models import Product
from .cart import Cart
from .forms import (
    CartAddProductForm, OrderForm, OrderItemForm
)

from django.conf import settings


@require_POST
def cart_add(request, product_id):
    cart = Cart(request)
    product = get_object_or_404(Product, id=product_id)
    form = CartAddProductForm(request.POST)
    if form.is_valid():
        cd = form.cleaned_data
        cart.add(product=product,
                 quantity=cd['quantity'],
                 price=cd['price'],
                 unit=cd['unit'],
                 update_quantity=cd['update'])
    return redirect('cart:cart_detail')


def cart_remove(request, product_id):
    cart = Cart(request)
    product = get_object_or_404(Product, id=product_id)
    cart.remove(product)
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
            for key, val in  item.items()
    } for item in cart]

    formset = []
    for item in order_items:
        formset.append(OrderItemForm(
            item | {
                'weight': item['product'].weight,
                'sum': item['total_price']
        }))

    try:

        with transaction.atomic():

            if order_form.is_valid():
                order_instance.save()  

            for form in formset:       
                if not form.is_valid():
                    raise ValidationError(form.errors.as_text())
                item_instance = form.save(commit=False)
                item_instance.order = order_instance
                item_instance.save()

    except ValidationError as error:
        transaction.rollback()
        cart.add_error(item['product'], error.message)
        return redirect('cart:errors')
    
    finally:
        if transaction.get_autocommit():
            transaction.commit()

    cart.clear()
    return redirect('orders:orders')