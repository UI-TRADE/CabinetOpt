from django.urls import path, re_path

from . import views

app_name = "clients"

urlpatterns = [
    path('reg_request/', views.register, name='reg_request'),
    path('login/', views.LoginFormView.as_view(), name='login'),
    path('logout/', views.logout, name='logout'),
    path('contact/', views.ContactDetailView.as_view(), name='contact'),
    path('contact/edit/', views.ContactDetailEditView.as_view(), name='edit'),
    path('contact/edit/<str:id>/', views.ContactDetailEditView.as_view(), name='edit'),
]
