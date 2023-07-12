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
            'size',
            'quantity',
            'unit',
            'price',
            'sum',
            'discount',
            'price_type',
        ]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['discount'].required = False


class CartAddProductForm(forms.Form):
    # quantity = forms.TypedChoiceField(
    #     choices=PRODUCT_QUANTITY_CHOICES, coerce=int
    # )
    quantity = forms.IntegerField(required=True)
    size = forms.FloatField(required=False)
    weight = forms.FloatField(required=False)
    price = forms.DecimalField(required=False)
    unit = forms.CharField(required=False)
    update = forms.BooleanField(
        required=False, initial=False, widget=forms.HiddenInput
    )