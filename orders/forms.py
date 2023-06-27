from django.forms.models import BaseInlineFormSet, inlineformset_factory
from orders.models import Order, OrderItem


class OrderItemInlineForm(BaseInlineFormSet):

    def add_fields(self, form, index):
        super().add_fields(form, index)
        for field in form.fields:
            if field == 'DELETE':
                form.fields[field].widget.attrs['style'] = 'display: none'
                continue
            form.fields[field].widget.attrs['class'] = 'form-control'
            form.fields[field].widget.attrs['onchange'] = 'updateOrderItem(this)'

    def clean(self):
        super().clean()


OrderItemInline = inlineformset_factory(
    Order,
    OrderItem,
    fields = [
        'product',
        'series',
        'uin',
        'weight',
        'size',
        'quantity',
        'unit',
        'price',
        'discount',
        'sum',
    ],
    formset=OrderItemInlineForm,
    extra=0,
    can_delete=True
)
