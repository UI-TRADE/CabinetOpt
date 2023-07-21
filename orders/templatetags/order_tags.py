import uuid
from django import template
from num2words import num2words


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


@register.simple_tag
def in_words(numder):
    if numder:
        return num2words(numder, lang='ru')
    return ''
