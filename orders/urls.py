from django.urls import path

from . import views
from django.conf import settings
from django.conf.urls.static import static

app_name = "orders"

urlpatterns = [
    path('products/', views.ProductView.as_view(), name='products'),
    path('сertificates/', views.CertificateView.as_view(), name='сertificates'),
    path('services/', views.ServiceView.as_view(), name='services'),
    path('product/<slug:prod_id>/', views.ProductCardView.as_view(), name='product'),
]
