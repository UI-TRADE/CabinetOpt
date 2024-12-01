from django import forms
from .models import Product, AlikeProductGroup
from .widgets import FilterHorizontalWidgetWithImport

class ProductFilterForm(forms.Form):
    articul = forms.CharField(max_length=200, required=False, strip=True, label='Артикул')
    status  = forms.ChoiceField(
        choices=Product.STATUS_CHOICES,
        required=False,
        label='Статус'
    )
    weight       = forms.FloatField(validators=[], label='Вес от')
    weight_till  = forms.FloatField(validators=[], label='до')
    size         = forms.CharField(max_length=10, required=False, strip=True, label='Размер')
    price        = forms.DecimalField(max_digits=8, validators=[], label='Базовая цена от')
    price_till   = forms.DecimalField(max_digits=8, validators=[], label='до')

    def __init__(self, readonly_fields=[], *args, **kwargs):
        super().__init__(*args, **kwargs)
        for field in self.fields:
            self.fields[field].widget.attrs['class'] = 'form-control filter-control'
        
        if not readonly_fields:
            return
        
        self.fields = {key: value for key, value in self.fields.items() if key in readonly_fields}
        for readonly_field in readonly_fields:
            if readonly_field == 'status':
                self.fields[readonly_field].widget.attrs['disabled'] = True
                continue
            self.fields[readonly_field].widget.attrs['readonly'] = True


class FileSelectionForm(forms.Form):
    file_path = forms.FileField(label='Выберите CSV файл', validators = [], widget=forms.FileInput())


class AlikeProductGroupForm(forms.ModelForm):

    alike_product = forms.ModelMultipleChoiceField(
        label = "Похожие товары",
        queryset=Product.objects.all(),
        widget=FilterHorizontalWidgetWithImport("Похожие товары", is_stacked=False),
        required=False
    )

    class Meta:
        model = AlikeProductGroup
        fields = '__all__'

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
    
