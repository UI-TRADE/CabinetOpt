from django.urls import path

from . import views

app_name = "shared_links"

urlpatterns = [
    path('<str:key>/', views.update_session_storage),
    path('create/', views.create_session_storage, name='create'),
    path('create/<str:param>/', views.create_session_storage, name='create'),
]
