import uuid
import simplejson as json
from decimal import Decimal

from django.conf import settings
from contextlib import suppress
from itertools import chain

from clients.login import Login
from catalog.models import Product, StockAndCost
from cart.models import Basket


def removed_cart_items(client, manager, keys):
    if not (client or manager):
        return
    qs = Basket.objects.filter(client=client) \
        & Basket.objects.filter(manager=manager)
    qs.exclude(uuid__in=keys).delete()


def update_cart_items(client, manager, keys, cart):
    if not (client or manager):
        return
    cart_items = Basket.objects.filter(uuid__in=[uuid for uuid in keys.keys()])
    cart_uuids = cart_items.values_list('uuid', flat=True)
    new_items, updated_items = [], [] 
    for key, value in keys.items():
        if key in cart_uuids:
            with suppress(Basket.DoesNotExist):
                obj = Basket.objects.get(uuid=key)
                if set(obj.attributes.items()) ^ set(cart[key].items()):
                    obj.key=value; obj.attributes=cart[key]
                    updated_items.append(obj)
            continue
        new_items.append(
            Basket(
                client=client, manager=manager,
                uuid=key, key=value, attributes=cart[key]
            ))
    if new_items:
        Basket.objects.bulk_create(new_items)
    if updated_items:
        Basket.objects.bulk_update(updated_items, ['key', 'attributes'])
    removed_cart_items(client, manager, [uuid for uuid in keys.keys()])


def get_cart_items(client, manager):
    keys, items = {}, {}
    if client and manager:
        qs = Basket.objects.filter(client=client) \
            & Basket.objects.filter(manager=manager)
        for item in qs:
            keys[item.uuid] = item.key
            items[item.uuid] = item.attributes

    return keys, items


def duplicate_cart_in_db():
    def class_decorator(cls):
        class DecoratedClass(cls):
            def __init__(self, *args, **kwargs):
                super().__init__(*args, **kwargs)
                login = Login(args[0])
                clients, managers = login.get_clients(), login.get_managers()
                if clients and managers:
                    self.client, self.manager = clients.first(), managers.first()
                else: self.client = self.manager = None

                self.keys, self.cart = get_cart_items(self.client, self.manager)
                self.handle_incorrect_items()

            def save(self):
                super().save()
                update_cart_items(
                    self.client, self.manager, self.keys, self.cart
                )

            def clear(self):
                super().clear()
                Basket.objects.filter(
                    client=self.client, manager=self.manager
                ).delete()

        return DecoratedClass
    return class_decorator


@duplicate_cart_in_db()
class Cart(object):

    def __init__(self, request, show_errors=False):
        self.session = request.session
        self.cart = json.loads(self.session.get(settings.CART_SESSION_ID, '{}'))
        self.keys = json.loads(self.session.get(settings.CART_SESSION_KEYS, '{}'))
        if not self.cart:
            self.keys, self.cart = {}, {}
            self.session[settings.CART_SESSION_ID] = json.dumps(self.cart, default=str)
            self.session[settings.CART_SESSION_KEYS] = json.dumps(self.keys, default=str)

        self.cart = {key: {
            k: '' if k == 'errors' and not show_errors else item for k, item in value.items()
        } for key, value in self.cart.items()}
  

    def __iter__(self):
        product_ids = [{key: value['product_id']} for key, value in self.keys.items()]
        products = Product.objects.filter(
            id__in=list(chain(
                *[[value for _, value in item.items()] for item in product_ids]
        ))).values()

        for product in products:
            with suppress(IndexError):
                keys = set(chain(
                    *[[key for key, value in item.items() if value == str(product['id'])] for item in product_ids]
                ))
                for key in keys:
                    self.cart[key]['product'] = product

        for key, item in self.cart.items():
            if not item.get('product'): continue
            item['id'] = key
            item['total_price'] = round(
                (item['price'] if item['price'] else 0) * item['quantity'],
                2
            ) 
            yield item


    def __len__(self):
        return sum(item['quantity'] for item in self.cart.values())


    def set_key(self, product_id, **kwargs):
        unique_id = str(uuid.uuid4())
        self.keys[unique_id] = {'product_id': str(product_id)} | kwargs
        return unique_id


    def get_key(self, product_id, **kwargs):
        with suppress(IndexError):
            return [key for key, value in self.keys.items() if value['product_id']==str(product_id) and value['size']==kwargs['size']][0]


    def add(self, product, **kwargs):
        quantity = kwargs['quantity']
        update_quantity = kwargs['update']
        key = self.get_key(product.id, size = kwargs['size'])
        if not key:
            key = self.set_key(product.id, size = kwargs['size'])
        if key not in self.cart:
            self.cart[key] = {
                key: value if not isinstance(value, Decimal) else float(value) \
                for key, value in kwargs.items()
            } | {'errors': ''}
            self.cart[key]['quantity'] = 0
        if update_quantity:
            self.cart[key]['quantity'] += quantity
        else:
            self.cart[key]['quantity'] = quantity
        self.save()


    def save(self):
        self.session[settings.CART_SESSION_KEYS] = json.dumps(self.keys, default=str)
        self.session[settings.CART_SESSION_ID] = json.dumps(self.cart, default=str)
        self.session.modified = True


    def clear(self):
        del self.session[settings.CART_SESSION_ID]
        del self.session[settings.CART_SESSION_KEYS]
        self.session.modified = True


    def remove(self, product_id, **kwargs):
        key = self.get_key(product_id, size= kwargs.get('size', ''))
        if key in self.cart:
            del self.cart[key]
            del self.keys[key]
            self.save()


    def info(self, product_id, **kwargs):
        if not product_id:
            return [self.keys[key] | value | {'sum': self.get_total_price(key)} for key, value in self.cart.items()]
        
        key = self.get_key(product_id, size= kwargs['size'])
        if key in self.cart:
            return self.cart[key] | {'sum': self.get_total_price(key)}
        

    def get_total_price(self, *keys):
        if keys:
            return round(
            sum(
                item['price'] * item['quantity'] \
                    for key, item in self.cart.items() if item['price'] and key in keys
            ),
            2
        )

        return round(
            sum(
                item['price'] * item['quantity'] \
                    for item in self.cart.values() if item['price']
            ),
            2
        )


    def get_total_weight(self, *keys):
        if keys:
            return round(
            sum(
                item['weight'] * item['quantity'] \
                    for key, item in self.cart.items() if item['weight'] and key in keys
            ),
            3
        )

        return round(
            sum(
                item['weight'] * item['quantity'] \
                    for item in self.cart.values() if item['weight']
            ),
            3
        )
    

    def get_total_quantity(self, *keys):
        if keys:
            return round(
            sum(item['quantity'] for key, item in self.cart.items() if key in keys),
            3
        )

        return round(
            sum(item['quantity'] for item in self.cart.values()),
            3
        )


    def get_total_max_price(self):
        return round(
            sum(
                item['max_price'] * item['quantity'] \
                    for item in self.cart.values() if item.get('max_price')
            ),
            2
        )

    def add_error(self, product_id, errors, **kwargs):
        key = self.get_key(product_id, **kwargs)
        self.cart[key]['errors'] = errors
        self.save()


    def handle_incorrect_items(self):
        removed_items = []
        for key, value in self.keys.items():

            try:
                Product.objects.get(pk=value['product_id'])
            except Product.DoesNotExist:
                removed_items.append(key)

            if value.get('size') == 'None':
                value['size'] = self.cart[key]['size'] = ''

        if removed_items:
            self.keys = {key: value for key, value in self.keys.items() if not key in removed_items}
            self.cart = {key: value for key, value in self.cart.items() if not key in removed_items}


class CartExtension(Cart):
    
    def __init__(self, request, show_errors=False):
        super().__init__(request, show_errors)

    def __iter__(self):
        product_ids = [{key: value['product_id']} for key, value in self.keys.items()]
        products = Product.objects.filter(
            id__in=list(chain(
                *[[value for _, value in item.items()] for item in product_ids]
        ))).values()

        for product in products:
            with suppress(IndexError):
                keys = set(chain(
                    *[[key for key, value in item.items() if value == str(product['id'])] for item in product_ids]
                ))
                for key in keys:
                    self.cart[key]['product'] = product

        for key, item in self.cart.items():
            if not item.get('product'): continue
            item['id'] = key
            item['total_price'] = round(
                (item['price'] if item['price'] else 0) * item['quantity'],
                2
            )
            yield item | self.update_stock(key)


    def update_stock(self, key):
        result = {'stock':0}
        key_info = self.keys[key]
        stock = StockAndCost.objects.get_stocks(key_info['product_id'], key_info['size'])
        if stock and stock.get('total_stock', 0):
            result['stock'] = stock['total_stock']
        return result
