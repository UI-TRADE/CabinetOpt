import simplejson as json

from django.apps import apps
from django.http import JsonResponse
from django.db.models import Sum
from django.shortcuts import render, redirect, get_object_or_404
from django.views.decorators.http import require_POST
from django.core.exceptions import ValidationError
from collections import defaultdict
from contextlib import suppress
from functools import wraps

from clients.login import Login
from catalog.models import Product, Size, StockAndCost
from .cart import Cart, CartExtension
from .forms import CartAddProductForm
from orders.views import save_order
from utils.exceptions import handle_errors
from settings_and_conditions.models import NotificationType
from settings_and_conditions.utils import notification_scheduling

from django.conf import settings


@handle_errors()
@notification_scheduling(NotificationType.CONFIM_ORDER)
@notification_scheduling(NotificationType.GET_ORDER)
def schedule_send_order(order, *params):
    pass


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
def cart_add_sizes(request, product_id=-1):
    cart = Cart(request)
    product = get_object_or_404(Product, id=product_id)
    raw_data = request.POST.get('sizes')
    if raw_data:
        sizes = json.loads(raw_data)
        for added_size in sizes:
            form = CartAddProductForm(added_size)
            if form.is_valid():
                selected_prod_params = form.cleaned_data
                cart.add(product, **selected_prod_params)

    return redirect('cart:cart_detail')


def cart_info(request, product_id='', size=''):
    cart = Cart(request)
    return JsonResponse(cart.info(product_id, size=size), safe=False)


def cart_remove_size(request, product_id, size):
    cart = Cart(request)
    cart.remove(product_id, size=size)

    return redirect('cart:cart_detail')


def cart_remove(request, product_id):
    cart = Cart(request)
    size_data = request.POST.get('sizes')
    if size_data:
        sizes = json.loads(size_data)
        for removed_size in sizes:
            cart.remove(product_id, size=removed_size['size'])
    else:
        cart.remove(product_id)

    return redirect('cart:cart_detail')


def cart_detail(request):
    app_config = apps.get_app_config('cart')
    cart = CartExtension(request)
    return render(
        request,
        'pages/cart.html',
        {
            'cart': cart,
            'share_link': request.build_absolute_uri(request.get_full_path()),
            'MEDIA_URL': settings.MEDIA_URL,
            'send_into_talant': app_config.send_into_talant_from_cart
    })


def cart_detail_with_errors(request):
    cart = CartExtension(request, True)
    return render(
        request,
        'pages/cart.html',
        {
            'cart': cart,
            'share_link': request.build_absolute_uri(request.get_full_path()),
            'MEDIA_URL': settings.MEDIA_URL
    })


def edit_product(request, prod_id):

    if request.method != 'POST':
        cart = list(Cart(request))
        context = Product.objects.filter(pk=prod_id)
        return render(
            request,
            'forms/product_editing.html',
            {
                'object': context.first(),
                'cart': json.dumps([{**item, 'product': None} for item in cart if str(item['product']['id']) == prod_id]),
                'is_sized': bool(StockAndCost.objects.filter(product_id=prod_id, size__isnull=False)),
                'stock_and_cost': StockAndCost.objects.filter(product_id=prod_id).order_by('size__size_from')
        })


@require_POST
def add_order(request):
    
    def add_comment(request):
        def wrap(func):
            @wraps(func)
            def run_func(client, manager, status, provision, cart):
                instance = func(client, manager, status, provision, cart)
                with suppress(IndexError):
                    import ipdb; ipdb.set_trace()
                    order_note = dict(request.POST).get('order-note')
                    instance.comment = order_note[0]
                    instance.save(update_fields=["comment"])

                return instance
            return run_func
        return wrap

    def split_products(cart):
        cart_out_of_stock = []
        cart_in_stock = defaultdict(list)

        for item in cart:
            product_id = item['product']['id']

            if item.get('size'):
                stocks = StockAndCost.objects.get_stocks(product_id, item['size'])
            else:
                stocks = StockAndCost.objects.get_stocks(product_id)

            if not stocks:
                cart_out_of_stock.append(item)
                continue
            elif not stocks.get('total_stock', 0):
                cart_out_of_stock.append(item)
                continue
            elif stocks['total_stock'] < item['quantity']:
                current_stock = stocks['total_stock']
                item_out_of_stock = item.copy()
                item_out_of_stock['quantity'] = item['quantity'] - current_stock
                item_out_of_stock['total_price'] = round(item_out_of_stock['quantity'] * item_out_of_stock['price'], 2)
                cart_out_of_stock.append(item_out_of_stock)

                item['quantity'] = current_stock
                item['total_price'] = round(item['quantity'] * item['price'], 2)

            if item['quantity'] > 0:
                cart_in_stock[item['product']['metal']].append(item)

        return cart_in_stock, cart_out_of_stock

    @add_comment(request)
    def create_order(client, manager, status, provision, cart):
        order_items = []
        for item in cart:
            item['product'] = Product.objects.get(pk=item['product']['id'])
            with suppress(Size.DoesNotExist):
                size_name = item['size']
                item['size']    = None
                item['size']    = Size.objects.get(name=size_name)
            if item['weight'] and item['unit'] != '796':
                item['weight'] = round(item['quantity'] * item['weight'], 3)
            order_items.append(item)

        return save_order(
            {
                'client'   : client,
                'manager'  : manager,
                'provision': provision,
                'status'   : status
            },
            order_items
        )

    cart = Cart(request)
    login = Login(request)

    clients, managers = login.get_clients(), login.get_managers()
    if clients and managers:
        client, manager = clients.first(), managers.first()

    if int(request.POST['split_orders']):
        order_status = 'confirmed'
        cart_in_stock, cart_out_of_stock = split_products(cart)
    else:
        order_status = 'introductory'
        cart_in_stock, cart_out_of_stock = [item for item in cart], []

    try:
        if cart_in_stock:
            if isinstance(cart_in_stock, defaultdict):
                for _, item in cart_in_stock.items():
                    order_instance = create_order(client, manager, order_status, 'П', item)
                    schedule_send_order(order_instance, order_status)
            else: 
                order_instance = create_order(client, manager, order_status, 'П', cart_in_stock)
                schedule_send_order(order_instance, order_status)

        if cart_out_of_stock:
            order_instance = create_order(client, manager, order_status, 'З', cart_out_of_stock)
            schedule_send_order(order_instance, order_status)

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
