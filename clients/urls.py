from django.urls import path

from . import views

app_name = "clients"

urlpatterns = [
    path('reg_request/'            , views.register, name='reg_request'),
    path('reg_request_confirm/'    , views.register_confirm, name='reg_request_confirm'),
    path('login/'                  , views.login, name='login'),
    path('logout/'                 , views.logout, name='logout'),
    path('check_login/'            , views.check_login, name='check_login'),
    path('login_recovery/'         , views.login_recovery, name='login_recovery'),
    path('change_pass/<str:id>/'   , views.change_password, name='change_pass'),
    path('request_pass/'           , views.request_password, name='request_pass'),
    path('recovery_pass/<str:id>/' , views.recovery_password, name='recovery_pass'),
    path('contact/'                , views.ContactDetailView.as_view(), name='contact'),
    path('contact/edit/<str:id>/'  , views.ContactDetailEditView.as_view(), name='edit'),
    path('contact/edit/'           , views.ContactDetailCreateView.as_view(), name='edit'),
    path('manager/'                , views.ManagerView.as_view(), name='manager'),
    path('manager/add/'            , views.ManagerAddView.as_view(), name='add_manager'),
]
