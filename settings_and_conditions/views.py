from django.shortcuts import render

from .models import Guarantee, Policy, Delivery, About

def guarantee(request):
    template = 'pages/conditions.html'
    obj = Guarantee.objects.first()
    if obj:
        return render(request, template, {'condition': obj.guarantee})
    return render(request, template, {'condition': ''})


def policy(request):
    template = 'pages/conditions.html'
    obj = Policy.objects.first()
    if obj:
        return render(request, template, {'condition': obj.policy})
    return render(request, template, {'condition': ''})


def delivery(request):
    template = 'pages/conditions.html'
    obj = Delivery.objects.first()
    if obj:
        return render(request, template, {'condition': obj.delivery})
    return render(request, template, {'condition': ''})

def about(request):
    template = 'pages/conditions.html'
    obj = About.objects.first()
    if obj:
        return render(request, template, {'condition': obj.about})
    return render(request, template, {'condition': ''})
