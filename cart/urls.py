from django.urls import path, register_converter
from django.urls.converters import SlugConverter


from . import views
    
class SizeConverter:
    regex = '[.-a-zA-Z0-9_]*'

    def to_python(self, value):
        if not value:
            return ''
        if value == 'None':
            return ''
        return value

    def to_url(self, value):
        if not value:
            return ''
        if value == 'None':
            return ''
        return value    

register_converter(SizeConverter, 'size')

app_name = "cart"
urlpatterns = [
    path(''                                     , views.cart_detail, name='cart_detail'),
    path('send/<str:product_id>/'               , views.send_to_cart),
    path('add/<str:product_id>/'                , views.cart_add, name='cart_add'),
    path('add/sizes/<str:product_id>/'          , views.cart_add_sizes, name='cart_add_sizes'),
    path('info/'                                , views.cart_info),
    path('info/<str:product_id>/'               , views.cart_info),
    path('info/<str:product_id>/<size:size>'   , views.cart_info),
    path('remove/<str:product_id>/'             , views.cart_remove_sizes, name='cart_remove_sizes'),
    path('remove/<str:product_id>/<size:size>' , views.cart_remove, name='cart_remove'),
    path('order/create/'                        , views.add_order, name='create'),
    path('errors/'                              , views.cart_detail_with_errors, name='errors'),
    path('product/<str:prod_id>/'               , views.edit_product, name='product_editing'),
]
