import simplejson as json
from django import template

from catalog.models import Collection
from catalog.tree import get_tree, find_in_tree

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


@register.filter
def root(_, collection_id):
    tree = get_tree(
        [{
            'id': obj.id, 'name': obj.name
        } for obj in Collection.objects.filter(pk=collection_id)]
    )
    return {'collection': val for val in find_in_tree(json.loads(tree), 'root')}


@register.filter
def filtertojson(seq):
    return json.dumps({key: value for key, value in dict(seq).items() if not key in ['count', 'sum', 'nodes']})
