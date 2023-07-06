from django import forms
from django.forms.models import BaseInlineFormSet, inlineformset_factory
from catalog.models import ProductCost
from orders.models import Order, OrderItem


class OrderItemForm(forms.ModelForm):
    nomenclature = forms.CharField(max_length=100)
    nomenclature_size = forms.ChoiceField(validators=[], required=False)

    class Meta:
        model = OrderItem
        fields = '__all__'

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['nomenclature_size'].choices = self.get_sizes()

    def get_sizes(self):
        sizes = ProductCost.objects.all().values_list('size', flat=True).distinct()
        return (('0', '--'),) + tuple(((item, item) for item in sizes))


class OrderItemInlineForm(BaseInlineFormSet):

    def add_fields(self, form, index):
        hidden_fields = ['DELETE', 'product', 'size']
        readonly_fields = ['series', 'uin', 'weight', 'unit', 'price', 'discount', 'sum']
        super().add_fields(form, index)
        for field in form.fields:
            if field in hidden_fields:
                form.fields[field].widget.attrs['style'] = 'display: none'
                continue
            if field in readonly_fields:
                form.fields[field].widget.attrs['class'] = 'order__field form-control'
                form.fields[field].widget.attrs['readonly'] = True
                continue
            if field == 'nomenclature':
                form.fields[field].widget.attrs['class'] = 'order__field__nomenclature form-control'
                continue
            if field == 'nomenclature_size':
                form.fields[field].widget.attrs['class'] = 'order__field__nomenclature_size form-control'
                continue
            if field == 'product':
                form.fields[field].widget.attrs['class'] = 'order__field__product form-control'
                continue
            form.fields[field].widget.attrs['class'] = 'form-control'
            form.fields[field].widget.attrs['onchange'] = 'updateOrderItem(this)'

    def clean(self):
        super().clean()


OrderItemInline = inlineformset_factory(
    Order,
    OrderItem,
    form = OrderItemForm,
    formset=OrderItemInlineForm,
    fields = [
        'nomenclature',
        'series',
        'uin',
        'weight',
        'nomenclature_size',
        'quantity',
        'unit',
        'price',
        'discount',
        'sum',
        'product',
        'size',
    ],
    extra=0,
    can_delete=True
)
