from django.urls import path

from . import views

app_name = "catalog"

urlpatterns = [
    path('products/', views.ProductView.as_view(), name='products'),
    path('сertificates/', views.CertificateView.as_view(), name='сertificates'),
    path('services/', views.ServiceView.as_view(), name='services'),
    path('product/<slug:prod_id>/', views.ProductCardView.as_view(), name='product'),
    path('upload/products', views.upload_products),
    path('upload/images', views.upload_images),
    path('upload/price', views.upload_price),
]
