from django import forms
from django.template.loader import render_to_string
from django.utils.safestring import mark_safe

class PasswordInputWithButton(forms.PasswordInput):
    template_name = 'admin/widgets/password_input.html'

    def render(self, name, value, attrs=None, renderer=None):
        context = self.build_attrs(attrs, {'type': 'password', 'name': name})
        context['value'] = self.format_value(value)
        context['widget'] = {
            'name': name,
            'is_hidden': self.is_hidden,
            'required': self.is_required,
            'value': value,
            'attrs': self.build_attrs(self.attrs, attrs)
        }
        return mark_safe(render_to_string(self.template_name, context))

