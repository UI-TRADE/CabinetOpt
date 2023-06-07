import simplejson as json
from django.conf import settings

from catalog.models import Product


class Cart(object):

    def __init__(self, request, show_errors=False):
        self.session = request.session
        cart = json.loads(self.session.get(settings.CART_SESSION_ID, '{}'))
        if not cart:
            cart = {}
            self.session[settings.CART_SESSION_ID] = json.dumps(cart, default=str)
        self.cart = {key: {
            k: '' if k == 'errors' and not show_errors else item for k, item in value.items()
        } for key, value in cart.items()}

    def __iter__(self):
        product_ids = self.cart.keys()
        products = Product.objects.filter(id__in=product_ids).values()

        for product in products:
            self.cart[str(product['id'])]['product'] = product

        for item in self.cart.values():
            item['total_price'] = item['price'] * item['quantity']
            yield item

    def __len__(self):
        return sum(item['quantity'] for item in self.cart.values())

    def add(self, product, quantity=1, price=0, unit="", update_quantity=False):
        product_id = str(product.id)
        if product_id not in self.cart:
            self.cart[product_id] = {'quantity': 0,
                                    'price': price,
                                    'unit': unit,
                                    'errors': ''}
        if update_quantity:
            self.cart[product_id]['quantity'] = quantity
        else:
            self.cart[product_id]['quantity'] += quantity
        self.save()

    def save(self):
        self.session[settings.CART_SESSION_ID] = json.dumps(self.cart, default=str)
        self.session.modified = True

    def remove(self, product):
        product_id = str(product.id)
        if product_id in self.cart:
            del self.cart[product_id]
            self.save()

    def get_total_price(self):
        return sum(item['price'] * item['quantity'] for item in self.cart.values())


    def clear(self):
        del self.session[settings.CART_SESSION_ID]
        self.session.modified = True

    def add_error(self, product, errors):
        product_id = str(product.id)
        if product_id in self.cart:
            self.cart[product_id]['errors'] = errors
        self.save()
