import simplejson as json
from django import template
from contextlib import suppress


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
def get_gender_repr(genders):
    return ", ".join(list(genders.values_list("name", flat=True)))


@register.filter
def get_cut_type_image(cut_type_nodes):
    with suppress(IndexError, KeyError):
        return cut_type_nodes[0]['cut_type__image']
    return ''


@register.filter
def size_selection(seq, size):
    sizes_in_cart = [item for item in json.loads(seq) if item['size'] == size.name]
    if sizes_in_cart:
        return json.dumps(sizes_in_cart)
    return ''


@register.filter
def size_incart(seq, size):
    quantity_in_cart = [item['quantity'] for item in json.loads(seq) if item['size'] == size.name]
    print(quantity_in_cart)
    if quantity_in_cart:
        return quantity_in_cart[0]
    return 0
