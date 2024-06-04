from django.urls import path

from . import views

app_name = "users"

urlpatterns = [
    path('api-token-auth/', views.AuthToken.as_view()),
    path('upload', views.upload_users),
]
