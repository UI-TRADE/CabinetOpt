from django.urls import path

from . import views

app_name = "settings_and_conditions"

urlpatterns = [
    path('guarantee/', views.guarantee, name='guarantee'),
    path('policy/', views.policy, name='policy'),
    path('delivery/', views.delivery, name='delivery'),
    path('about/', views.about, name='about'),
]