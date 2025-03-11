from django.shortcuts import render

from .models import Guarantee, Policy, Delivery, About, Promo

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
    return render(
        request,
        template,
        {'condition': '', 'share_link': request.build_absolute_uri(request.get_full_path()),}
    )
