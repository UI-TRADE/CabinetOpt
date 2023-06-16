import simplejson as json
from django import template

register = template.Library()

@register.filter
def get_item_by_id(seq, id):
    try:
        return [item for item in seq if item['fields']['product'] == id][0]
    except (IndexError, ValueError):
        return {}


@register.filter
def loadjson(seq):
    return json.loads(seq)

@register.filter
def tojson(seq):
    return json.dumps(seq)

@register.filter
def get_unit_repr(unit):
    if unit == '163':
        return 'грамм'
    return 'штук'

@register.filter
def addparam(key, param):
    return {key: param}

@register.filter
def addtojson(seq, param):
    return seq | param
