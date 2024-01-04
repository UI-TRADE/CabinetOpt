import simplejson as json
from django.http import JsonResponse
from django.db.models import Sum
from django.shortcuts import render, redirect, get_object_or_404
from django.views.decorators.http import require_POST
from django.core.exceptions import ValidationError
from contextlib import suppress

from clients.login import Login
from catalog.models import Product, Size, StockAndCost
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


def cart_remove(request, product_id, size):
    cart = Cart(request)
    cart.remove(product_id, size=size)

    return redirect('cart:cart_detail')


def cart_remove_sizes(request, product_id):
    cart = Cart(request)
    raw_data = request.POST.get('sizes')
    if raw_data:
        sizes = json.loads(raw_data)
        for removed_size in sizes:
            cart.remove(product_id, size=removed_size['size'])

    return redirect('cart:cart_detail')


def cart_detail(request):
    cart = Cart(request)
    return render(request, 'pages/cart.html', {'cart': cart, 'MEDIA_URL': settings.MEDIA_URL})


def cart_detail_with_errors(request):
    cart = Cart(request, True)
    return render(request, 'pages/cart.html', {'cart': cart, 'MEDIA_URL': settings.MEDIA_URL})


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
    
    def split_products(cart):
        cart_in_stock = []
        cart_out_of_stock = []

        for item in cart:
            product_id = item['product']['id']

            qs = StockAndCost.objects.filter(product_id = product_id)
            if item['size']: 
                qs = qs.filter(size__name = item['size'])
            stocks = qs.values('product', 'size').annotate(total_stock=Sum('stock')).first()

            if not stocks:
                cart_out_of_stock.append(item)
                continue
            elif stocks['total_stock'] < item['quantity']:
                current_stock = stocks['total_stock']
                item_out_of_stock = item.copy()
                item_out_of_stock['quantity'] = current_stock
                item_out_of_stock['total_price'] = current_stock * item_out_of_stock['price']
                cart_out_of_stock.append(item_out_of_stock)

                item['quantity'] = item['quantity'] - current_stock
                item['total_price'] = item['quantity'] * item['price']

            cart_in_stock.append(item)

        return cart_in_stock, cart_out_of_stock

    def create_order(client, manager, provision, cart):
        order_items = []
        for item in cart:
            item['product'] = Product.objects.get(pk=item['product']['id'])
            with suppress(Size.DoesNotExist):
                size_name = item['size']
                item['size']    = None
                item['size']    = Size.objects.get(name=size_name)
            if item['weight']:
                item['weight'] = round(item['quantity'] * item['weight'], 3)
            order_items.append(item)

        save_order(
            {
                'client'   : client,
                'manager'  : manager,
                'provision': provision,
                'status'   : 'introductory'
            },
            order_items
        )

    cart = Cart(request)
    login = Login(request)

    clients = login.get_clients()
    managers = login.get_managers()

    if int(request.POST['split_orders']):
        cart_in_stock, cart_out_of_stock = split_products(cart)
    else:
        cart_in_stock, cart_out_of_stock = [item for item in cart], []

    try:

        if cart_in_stock: 
            create_order(clients.first(), managers.first(), 'П', cart_in_stock)

        if cart_out_of_stock:
            create_order(clients.first(), managers.first(), 'З', cart_out_of_stock)

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
