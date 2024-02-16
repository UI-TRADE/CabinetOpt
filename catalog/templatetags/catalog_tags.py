import simplejson as json
from django import template
from contextlib import suppress
from catalog.models import Product


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


@register.filter
def ifinlist(value, seq):
    return value in seq


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
def get_gender_repr(genders):
    return ", ".join(list(genders.values_list("name", flat=True)))


@register.filter
def get_status_repr(status):
    return Product.objects.get_status_view(status)


@register.filter
def get_cut_type_image(cut_type_nodes):
    with suppress(IndexError, KeyError):
        return cut_type_nodes[0]['cut_type__cut_type_image__image']
    return ''


@register.filter
def size_selection(seq, size):
    sizes_in_cart = [item for item in json.loads(seq) if item['size'] == size.name]
    if sizes_in_cart:
        return json.dumps(sizes_in_cart)
    return ''


@register.filter
def size_incart(seq, size):
    if len(seq) == 0:
        return 0
    with suppress(AttributeError):
        quantity_in_cart = [item['quantity'] for item in json.loads(seq) if item['size'] == size.name]
        if quantity_in_cart:
            return quantity_in_cart[0]
    return 0


@register.filter
def item_value(seq, name):
    result = 0
    with suppress(KeyError):
        items = json.loads(seq)
        for item in items:
            result += item[name]
    return result
