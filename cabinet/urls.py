from django.urls import path

from .views import cabinet_page


app_name = "cabinet"

urlpatterns = [
    path('', cabinet_page),
]