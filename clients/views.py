from django.shortcuts import render

from django.http import HttpResponse


def reg_client(request):
    return HttpResponse('Форма регистрации нового клиента')