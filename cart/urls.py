from django.urls import path

from . import views

app_name = "cart"

urlpatterns = [
    path('', views.cart_detail, name='cart_detail'),
    path('add/<str:product_id>/', views.cart_add, name='cart_add'),
    path('remove/<str:product_id>/<int:size>/', views.cart_remove, name='cart_remove'),
    path('order/create/', views.order_create, name='create'),
    path('errors/', views.cart_detail_with_errors, name='errors'),
]
