from django.shortcuts import render
from django.http import HttpResponse


# Create your views here.
def cabinet_page(request):
    return HttpResponse('Тестовая страница кабинета!')