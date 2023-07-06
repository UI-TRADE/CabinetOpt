import uuid
from django import template

register = template.Library()

@register.filter
def filter_by_id(seq, id):
    return seq.filter(order_id=id)[:3]


@register.simple_tag
def unique_id():
    return str(uuid.uuid4())


@register.filter
def is_hidden_field(field):
    if str(field).find('display: none') != -1:
        return True
