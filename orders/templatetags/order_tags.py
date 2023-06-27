import uuid
from django import template

register = template.Library()

@register.filter
def get_items_by_id(seq, id):
    return seq.filter(order_id=id)


@register.simple_tag
def unique_id():
    return str(uuid.uuid4())
