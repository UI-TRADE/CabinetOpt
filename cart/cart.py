import uuid

from django.conf import settings
from contextlib import suppress
from itertools import chain
import simplejson as json

from catalog.models import Product, ProductCost


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

        for item in self.cart.values():
            item['total_price'] = (item['price'] if item['price'] else 0) * item['quantity']
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
            self.cart[key] = kwargs | {'errors': ''}
            self.cart[key]['quantity'] = 0
        if update_quantity:
            self.cart[key]['quantity'] = quantity
        else:
            self.cart[key]['quantity'] += quantity
        self.save()


    def save(self):
        self.session[settings.CART_SESSION_KEYS] = json.dumps(self.keys, default=str)
        self.session[settings.CART_SESSION_ID] = json.dumps(self.cart, default=str)
        self.session.modified = True


    def remove(self, product_id, **kwargs):
        key = self.get_key(product_id, size= kwargs['size'])
        if key in self.cart:
            del self.cart[key]
            del self.keys[key]
            self.save()


    def get_total_price(self):
        return sum(item['price'] * item['quantity'] for item in self.cart.values() if item['price'])


    def get_total_max_price(self):
        return sum(item['max_price'] * item['quantity'] for item in self.cart.values() if item.get('max_price'))


    def clear(self):
        del self.session[settings.CART_SESSION_ID]
        del self.session[settings.CART_SESSION_KEYS]
        self.session.modified = True


    def add_error(self, product, errors):
        product_id = str(product.id)
        if product_id in self.cart:
            self.cart[product_id]['errors'] = errors
        self.save()
