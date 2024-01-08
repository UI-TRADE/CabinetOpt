import uuid
from django import template
from num2words import num2words
from more_itertools import first
from contextlib import suppress

from catalog.models import ProductImage

register = template.Library()

@register.filter
def filter_by_id(seq, id):
    return seq.filter(order_id=id)[:3]


@register.simple_tag
def unique_id():
    return str(uuid.uuid4())


@register.filter
def is_hidden_field(field):
    if str(field).find('display: none') != -1:
        return True


@register.simple_tag
def in_words(numder):
    if numder:
        return num2words(numder, lang='ru')
    return ''


@register.simple_tag
def first_product_image(id):
    product_image = first(
        ProductImage.objects.filter(product_id=id).values(),
        {'image': '0.jpg'}
    )
    return product_image['image']


@register.simple_tag
def do_split(items):
    if items:
        return any([item['in_stock'].value() for item in items])
    return False


@register.filter
def index(seq, idx):
    print(seq, idx, sep='\n')
    with suppress(KeyError):
        return seq[idx]
    return ''
