import simplejson as json
from django import template
from more_itertools import first

register = template.Library()

# @register.filter
# def get_item(seq, id):
#     if seq:
#         return first([item for item in seq if item.product_id == id], [])
#     return []

@register.filter
def loadjson(seq):
    return json.loads(seq)


@register.filter
def get_unit_repr(unit):
    if unit == '163':
        return 'грамм'
    return 'штук'

