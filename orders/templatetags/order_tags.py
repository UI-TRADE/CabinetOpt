import uuid
from django import template
from num2words import num2words
from more_itertools import first

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