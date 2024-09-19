import simplejson as json
from django import template
from contextlib import suppress
from catalog.models import Product
from functools import reduce


register = template.Library()


@register.filter
def tojson(seq):
    return json.dumps(seq)


@register.filter
def addparam(key, param):
    return {key: param}


@register.filter
def dictupdate(param1, param2):
    return dict(param1) | dict(param2)


@register.filter
def updateparam(first_param, second_param):
    result = []
    result.append(json.loads(first_param))
    result.append(json.loads(second_param))
    return json.dumps(result)


@register.filter
def filtertojson(seq):
    return json.dumps({key: value for key, value in dict(seq).items() if not key in ['count', 'sum', 'nodes']})


@register.filter
def join_qs(qs, key):
    return ", ".join(list(qs.values_list(key, flat=True)))


@register.filter
def get_status_repr(status):
    result = [value for key, value  in Product.STATUS_CHOICES if key == status]
    if result:
        return result[0]


@register.filter
def size_selection(seq, size):
    sizes_in_cart = [item for item in json.loads(seq) if item['size'] == size.name]
    if sizes_in_cart:
        return json.dumps(sizes_in_cart)
    return ''


@register.filter
def size_incart(seq, size):
    with suppress(AttributeError, IndexError, KeyError, json.errors.JSONDecodeError):
        items = json.loads(seq)
        return [item['quantity'] for item in items if item['size'] == size.name][0]
    return 0


@register.filter
def accumulate(seq, key):
    with suppress(KeyError, json.errors.JSONDecodeError):
        items = json.loads(seq)
        return reduce(lambda a, b: a+b, [item[key] for item in items if key in item])
    return 0


@register.simple_tag
def findparam(param, key, value):
    with suppress(AttributeError, IndexError, KeyError):
        return [item for item in param if item.get(key) == value][0]
    return {}
