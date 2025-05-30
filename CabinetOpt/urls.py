"""CabinetOpt URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.shortcuts import render
from django.conf import settings
from django.conf.urls.static import static

from . import views
from .views import custom_404_handler, custom_500_handler, custom_403_handler


handler404 = custom_404_handler
handler500 = custom_500_handler
handler403 = custom_403_handler

urlpatterns = [
    path('admin/'       , admin.site.urls),
    path('api-auth/'    , include('rest_framework.urls')),
    path('clients/'     , include('clients.urls')),
    path('users/'       , include('users.urls')),
    path('catalog/'     , include('catalog.urls')),
    path('orders/'      , include('orders.urls')),
    path('cart/'        , include('cart.urls')),
    path('summernote/'  , include('django_summernote.urls')),
    path('condition/'   , include('settings_and_conditions.urls')),
    path('django-rq/'   , include('django_rq.urls')),
    path('shared_links/', include('shared_links.urls')),
    path('', render, kwargs={'template_name': 'index.html'}, name='start_page'),
    path('forbidden/'   , views.forbidden_view, name='forbidden_view'),
]

urlpatterns += [
    path('captcha/', include('captcha.urls')),
]

if settings.DEBUG:
    urlpatterns += [
        path('__debug__/' , include('debug_toolbar.urls')),
        path('silk/', include('silk.urls', namespace='silk')),
    ]
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
