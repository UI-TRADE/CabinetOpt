from django import forms
from django.forms.models import BaseInlineFormSet, inlineformset_factory

from catalog.models import Product
from orders.models import Order, OrderItem


class ProductForm(forms.ModelForm):
    
    class Meta:
        model = Product
        fields = '__all__'


class OrderItemInlineForm(BaseInlineFormSet):

    def add_fields(self, form, index):
        super().add_fields(form, index)
        for field in form.fields:
            form.fields[field].widget.attrs['class'] = 'form-control'
            form.fields[field].widget.attrs['onchange'] = 'updateOrderItem(this)'

    def clean(self):
        cleaned_data = super().clean()
        return cleaned_data


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
        # 'price_type',
    ],
    formset=OrderItemInlineForm,
    extra=0,
    can_delete=True
)
