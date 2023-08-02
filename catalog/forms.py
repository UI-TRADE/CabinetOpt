from django import forms


class ProductFilterForm(forms.Form):
    articul = forms.CharField(max_length=200, required=False, strip=True, label='Артикул')
    status  = forms.ChoiceField(
        choices=(
            (''       , '--'),
            ('novelty', 'NEW!'),
            ('order'  , 'ЗАКАЗ'),
            ('hit'    , 'ХИТ'),
            ('sale'   , 'ВЫГОДНО'),
        ),
        required=False,
        label='Статус'
    )
    weight  = forms.FloatField(validators=[], label='Вес')
    size    = forms.CharField(max_length=10, required=False, strip=True, label='Размер')
    price   = forms.DecimalField(max_digits=8, validators=[], label='Базовая цена')

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        for field in self.fields:
            self.fields[field].widget.attrs['class'] = 'form-control filter-control'
