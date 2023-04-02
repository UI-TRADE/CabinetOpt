from django.urls import path

from . import views

app_name = "clients"

urlpatterns = [
    path('create_request/', views.update_reg_order, name='create_request'),
    path('add_request/', views.reg_order_view, name='add_request'),
]
