from contextlib import suppress
from django import forms
from django.db.models import Sum
from django.forms.models import BaseInlineFormSet, inlineformset_factory
from django.core.validators import MinValueValidator, MaxValueValidator
from catalog.models import Size, StockAndCost, PriceType, Price
from orders.models import Order, OrderItem


class FileSelectionForm(forms.Form):
    file_path = forms.FileField(validators = [], widget=forms.FileInput())


class OrderForm(forms.ModelForm):
    class Meta:
        model = Order
        fields = [
            'client',
            'manager',
            'status',
            'provision',
        ]
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['provision'].required = False


class OrderItemForm(forms.ModelForm):
    nomenclature = forms.CharField(max_length=100, required = False)
    nomenclature_size = forms.ChoiceField(required = False)
    price_per_gr = forms.DecimalField(required = False, validators=[MinValueValidator(0)])
    in_stock = forms.BooleanField()

    class Meta:
        model = OrderItem
        fields = [
            'product',
            'weight',
            'size',
            'quantity',
            'unit',
            'price',
            'sum',
            'discount',
            'price_type',
            'nomenclature',
            'nomenclature_size',
            'in_stock',
            'price_per_gr',
        ]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        self.fields['discount'].required = False
        self.fields['size'].required = False
        self.fields['unit'].required = False
        self.fields['in_stock'].required = False
        self.fields['price_per_gr'].required = False

        self.fields['nomenclature'].initial = self.current_product(kwargs)
        self.fields['nomenclature_size'].choices = self.get_sizes()
        self.fields['in_stock'].initial = self.get_in_stock(kwargs)
        self.fields['price_per_gr'].initial = self.get_price_per_gr(kwargs)

    def current_product(self, kwargs):
        instance = kwargs.get('instance')
        with suppress(AttributeError):
            if instance:
                return instance.product.id
        return ''

    def get_sizes(self):
        sizes = Size.objects.all().values_list('name', flat=True).distinct()
        return (('0', '--'),) + tuple((('%s' % item, '%s' % item) for item in sizes))
    
    def get_in_stock(self, kwargs):
        with suppress(IndexError):
            instance = kwargs.get('instance')
            if instance:
                qs = StockAndCost.objects.filter(product = instance.product)
                if instance.size and instance.size.size_from: 
                    qs = qs.filter(size = instance.size)
                stocks = qs.values('product', 'size').annotate(total_stock=Sum('stock'))[0]
                if stocks and stocks.get('total_stock', 0) < instance.quantity:
                    return True

        return False
    
    def get_price_per_gr(self, kwargs):
        instance = kwargs.get('instance')
        with suppress(AttributeError):
            if instance:
                prices = Price.objects.available_prices([instance.product.id])
                with suppress(PriceType.DoesNotExist):
                    client_prices = Price.objects.available_prices(
                        [instance.product.id], PriceType.objects.get(client = instance.order.client)
                    )
                    prices = prices.exclude(
                        product_id__in = client_prices.values_list('product_id', flat=True)
                    ) | client_prices
                
                current_price = prices.first()
                if current_price:
                    return current_price.price

        return 0



class OrderItemInlineForm(BaseInlineFormSet):

    def add_fields(self, form, index):
        super().add_fields(form, index)
        form.fields['nomenclature'].widget.attrs['class'] = 'order__field__nomenclature form-control'
        form.fields['nomenclature_size'].widget.attrs['class'] = 'order__field__nomenclature_size form-control'
        for text_field in ['product', 'size', 'unit']:
            form.fields[text_field].widget = forms.TextInput()
            form.fields[text_field].widget.attrs['class'] = 'order__field form-control'
        form.fields['product'].widget.attrs['class'] += 'order__field__product'
        for readonly_field in ['weight', 'price', 'discount', 'sum']:
            form.fields[readonly_field].widget.attrs['class'] = 'order__field form-control'
            form.fields[readonly_field].widget.attrs['readonly'] = True
        for field in ['quantity', 'in_stock', 'price_per_gr']:
            form.fields[field].widget.attrs['class'] = 'order__field form-control'

    def clean(self):
        super().clean()


OrderItemInline = inlineformset_factory(
    Order,
    OrderItem,
    form = OrderItemForm,
    formset=OrderItemInlineForm,
    fields = [
        'nomenclature',
        'weight',
        'nomenclature_size',
        'quantity',
        'unit',
        'price',
        'discount',
        'sum',
        'product',
        'size',
        'in_stock',
    ],
    extra=0,
    can_delete=True
)
