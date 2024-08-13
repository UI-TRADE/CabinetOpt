from django.urls import path

from . import views

app_name = "shared_links"

urlpatterns = [
    path('<str:key>/', views.update_session_storage),
]
