from django.urls import path, register_converter
from django.urls.converters import SlugConverter


from . import views

class FloatConverter:
    regex = r'[-+]?\d*\.\d+|\d+'

    def to_python(self, value):
        return float(value)

    def to_url(self, value):
        return str(value)

register_converter(FloatConverter, 'float')

app_name = "cart"
urlpatterns = [
    path(''                                   , views.cart_detail, name='cart_detail'),
    path('send/<str:product_id>/'             , views.send_to_cart),
    path('add/<str:product_id>/'              , views.cart_add, name='cart_add'),
    path('remove/<str:product_id>/<float:size>/', views.cart_remove, name='cart_remove'),
    path('order/create/'                      , views.order_create, name='create'),
    path('errors/'                            , views.cart_detail_with_errors, name='errors'),
]
