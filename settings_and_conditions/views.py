import json
from django.shortcuts import render

from rest_framework.serializers import ModelSerializer

from .models import Guarantee, Policy, Delivery, About, Promo
from clients.models import Office


class OfficeSerializer(ModelSerializer):
    
    class Meta:
        model = Office
        fields = ['address', 'lng', 'lat', 'phone', 'email']


def guarantee(request):
    template = 'pages/conditions.html'
    obj = Guarantee.objects.first()
    if obj:
        return render(
            request,
            template,
            {
                'condition': obj.guarantee,
                'share_link': request.build_absolute_uri(request.get_full_path()),
        })
    return render(
        request,
        template,
        {'condition': '', 'share_link': request.build_absolute_uri(request.get_full_path()),}
    )


def policy(request):
    template = 'pages/conditions.html'
    obj = Policy.objects.first()
    if obj:
        return render(
            request,
            template, 
            {
                'condition': obj.policy,
                'share_link': request.build_absolute_uri(request.get_full_path()),
        })
    return render(
        request,
        template,
        {'condition': '', 'share_link': request.build_absolute_uri(request.get_full_path()),}
    )


def delivery(request):
    template = 'pages/conditions.html'
    obj = Delivery.objects.first()
    if obj:
        return render(
            request,
            template,
            {
                'condition': obj.delivery,
                'share_link': request.build_absolute_uri(request.get_full_path()),
        })
    return render(
        request,
        template,
        {'condition': '', 'share_link': request.build_absolute_uri(request.get_full_path()),}
    )


def about(request):
    template = 'pages/conditions.html'
    obj = About.objects.first()
    if obj:
        return render(
            request,
            template,
            {
                'condition': obj.about,
                'share_link': request.build_absolute_uri(request.get_full_path()),
        })
    return render(
        request,
        template,
        {'condition': '', 'share_link': request.build_absolute_uri(request.get_full_path()),}
    )


def promo(request):
    template = 'pages/promotions.html'
    obj = Promo.objects.first()
    if obj:
        return render(
            request,
            template,
            {
                'description': obj.description,
                'share_link': request.build_absolute_uri(request.get_full_path()),
        })
    return render(
        request,
        template,
        {'description': '', 'share_link': request.build_absolute_uri(request.get_full_path()),}
    )

def where_to_buy(request):
    template = 'pages/where-to-buy.html'
    context = Office.objects.all()
    return render(
        request,
        template,
        {
            'context': context,
            'json_context': json.dumps(
                OfficeSerializer(context, many=True).data
            ),
            'share_link': request.build_absolute_uri(request.get_full_path()),
    })
