from django import template
from more_itertools import first

from catalog.models import ProductImage

register = template.Library()


@register.simple_tag
def first_product_image(id):
    product_image = first(
        ProductImage.objects.filter(product_id=id).values(),
        {'image': '0.jpg'}
    )
    return product_image['image']
