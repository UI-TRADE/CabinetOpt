from django import template
from more_itertools import first

register = template.Library()

@register.filter
def get_items_by_id(seq, id):
    return seq.filter(order_id=id)
