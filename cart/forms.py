from django import forms

from orders.models import Order, OrderItem

PRODUCT_QUANTITY_CHOICES = [(i, str(i)) for i in range(1, 51)]


class OrderForm(forms.ModelForm):
    class Meta:
        model = Order
        fields = [
            'client',
            'manager',
            'status',
        ]


class OrderItemForm(forms.ModelForm):
    class Meta:
        model = OrderItem
        fields = [
            'product',
            'series',
            'uin',
            'weight',
            'quantity',
            'unit',
            'price',
            'sum',
            'discount',
            'price_type',
        ]


class CartAddProductForm(forms.Form):
    quantity = forms.TypedChoiceField(
        choices=PRODUCT_QUANTITY_CHOICES, coerce=int
    )
    price = forms.DecimalField(required=False, initial=False)
    unit = forms.CharField(required=False, initial=False)
    update = forms.BooleanField(
        required=False, initial=False, widget=forms.HiddenInput
    )