from django import forms

class CartAddProductForm(forms.Form):
    quantity = forms.IntegerField(required=True)
    size = forms.CharField(required=False)
    weight = forms.FloatField(required=False)
    price = forms.DecimalField(required=False)
    unit = forms.CharField(required=False)
    update = forms.BooleanField(
        required=False, initial=False, widget=forms.HiddenInput
    )