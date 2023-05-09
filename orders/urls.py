from django.urls import path

from . import views

app_name = "orders"

urlpatterns = [
    path('products/', views.ProductView.as_view(), name='products'),
    path('сertificates/', views.CertificateView.as_view(), name='сertificates'),
    path('services/', views.ServiceView.as_view(), name='services'),
    path('product/<slug:prod_id>/', views.ProductCardView.as_view(), name='product'),
    path('orders/', views.OrderView.as_view(), name='orders'),
    path('order/edit/<slug:order_id>/', views.UpdateOrderView.as_view(), name='edit'),
    path('order/remove/<slug:order_id>/', views.remove_order, name='remove'),
    path('order/create/<slug:order_id>/', views.CreateOrderView.as_view(), name='create'),
    path('upload/products', views.upload_products),
    path('upload/images', views.upload_images),
]
