from django import template
from more_itertools import first

register = template.Library()

@register.filter
def get_item(seq, id):
    return first([item for item in seq if item['product_id']==id], [])
