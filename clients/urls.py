from django.urls import path

from . import views

app_name = "clients"

urlpatterns = [
    path('reg_request/', views.register, name='reg_request'),
]
