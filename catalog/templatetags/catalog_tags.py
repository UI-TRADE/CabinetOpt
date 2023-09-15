import simplejson as json
from django import template

from catalog.models import Collection
from catalog.tree import get_tree, find_in_tree

register = template.Library()


@register.filter
def tojson(seq):
    return json.dumps(seq)


@register.filter
def addparam(key, param):
    return {key: param}


@register.filter
def filtertojson(seq):
    return json.dumps({key: value for key, value in dict(seq).items() if not key in ['count', 'sum', 'nodes']})


@register.filter
def get_gender_repr(product):
    return ", ".join(list(product.gender.values_list('name', flat=True)))
