from django.urls import path

from .views import reg_client


app_name = "clients"

urlpatterns = [
    path('', reg_client),
]