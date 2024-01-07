import uuid
from django import template
from more_itertools import first
import simplejson as json

from catalog.models import ProductImage

register = template.Library()


@register.filter
def tojson(seq):
    return json.dumps(seq)


@register.filter
def addparam(key, param):
    return {key: param}


@register.filter
def addparams(param1, param2):
    return dict(param1) | dict(param2)


@register.simple_tag
def first_product_image(id):
    product_image = first(
        ProductImage.objects.filter(product_id=id).values(),
        {'image': '0.jpg'}
    )
    return product_image['image']


@register.simple_tag
def unique_id():
    return str(uuid.uuid4())


@register.filter
def get_unit_repr(unit):
    if unit == '163':
        return 'грамм'
    return 'штук'


@register.simple_tag
def total_weight(weight, quantity):
    if weight:
        return weight * quantity
    return 0
