from django.urls import reverse
from django.contrib.admin.widgets import FilteredSelectMultiple
from django.utils.safestring import mark_safe

class FilterHorizontalWidgetWithImport(FilteredSelectMultiple):

    def __init__(self, verbose_name, is_stacked=False, attrs=None):
        super().__init__(verbose_name, is_stacked, attrs)

    def render(self, name, value, attrs=None, renderer=None):
        if value is None: value = []
        output = super().render(name, value, attrs, renderer)
        import_url = reverse('admin:select-file')
        import_button = mark_safe(f'''
            <a id="alike-products-link" href="javascript:void(0);" class="addlink" style="margin-left: 10px;" data-url="{import_url}">
                Импорт
            </a>
        ''')
        return output + import_button
