from django.urls import path

from . import views

app_name = "settings_and_conditions"

urlpatterns = [
    path('promo/', views.promo, name='promo'),
    path('guarantee/', views.guarantee, name='guarantee'),
    path('policy/', views.policy, name='policy'),
    path('delivery/', views.delivery, name='delivery'),
    path('about/', views.about, name='about'),
    path('where-to-buy/', views.where_to_buy, name='where-to-buy'),
]