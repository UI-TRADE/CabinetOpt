from django.urls import path, re_path

from . import views

app_name = "clients"

urlpatterns = [
    path('reg_request/'          , views.register, name='reg_request'),
    path('reg_request_confirm/'  , views.register_confirm, name='reg_request_confirm'),
    path('login/'                , views.login, name='login'),
    path('logout/'               , views.logout, name='logout'),
    path('contact/'              , views.ContactDetailView.as_view(), name='contact'),
    path('contact/edit/<str:id>/', views.ContactDetailEditView.as_view(), name='edit'),
    path('contact/edit/'         , views.ContactDetailCreateView.as_view(), name='edit'),
    path('manager/'              , views.ManagerView.as_view(), name='manager'),
    path('manager/add/'          , views.ManagerAddView.as_view(), name='add_manager'),
]
