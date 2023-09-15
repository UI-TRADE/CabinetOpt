from django.urls import path, register_converter
from datetime import datetime

from . import views

class DateConverter:
    regex = '\d{4}-\d{2}-\d{2}'

    def to_python(self, value):
        return datetime.strptime(value, '%Y-%m-%d')

    def to_url(self, value):
        return value    

register_converter(DateConverter, 'data')

app_name = "orders"
urlpatterns = [
    path('orders/', views.OrderView.as_view(), name='orders'),
    path('order/edit/<slug:order_id>/', views.UpdateOrderView.as_view(), name='edit'),
    path('order/remove/<slug:order_id>/', views.remove_order, name='remove'),
    path('order/create/<slug:order_id>/', views.CreateOrderView.as_view(), name='create'),
    path('order/item/create', views.add_order_item),
    path('stocks_and_costs/', views.stocks_and_costs),
    path('order/export', views.unload_orders),
    path('order/export/<data:data_from>', views.unload_orders),
    path('order/export/<data:data_from>/<data:data_to>', views.unload_orders),
    path('order/export/pdf/<slug:order_id>/', views.ExportPDFView.as_view(), name='export-pdf'),
    path('order/export/xlsx/<slug:order_id>/', views.ExportXLSXView.as_view(), name='export-xlsx'),
    path('order/import/xlsx/', views.import_xlsx, name='import-xlsx'),
]
