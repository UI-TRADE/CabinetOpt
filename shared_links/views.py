import json

from contextlib import suppress
from datetime import timedelta
from django.http import JsonResponse
from django.utils import timezone
from more_itertools import first
from rest_framework.decorators import api_view

from .models import Link

class ErrorValidation(Exception):...


@api_view(['GET'])
def update_session_storage(request, key):
    with suppress(Link.DoesNotExist):
        obj = Link.objects.get(key=key)
        return JsonResponse({'replay': 'ok', 'code': '200', 'path': obj.path} | obj.param)
    return JsonResponse({'replay': 'error', 'code': '404', 'description': 'url not defined'})


@api_view(['GET', 'POST'])
def create_session_storage(request, *args, **kwargs):
    with suppress(ErrorValidation):
        if request.method == 'POST': 
            # Заглушка, оставлено для дальнейшего возможного использования
            raise ErrorValidation

        raw_url = dict(request.GET).get('target')
        if not raw_url: raise ErrorValidation

        full_path = first(raw_url, '')
        params = {'filters': json.dumps([json.loads(kwargs.get('param'))]), 'sorting': '{}'}

        link = Link.objects.create(
            path = full_path,   
            param = params,
            expired_at = timezone.now() + timedelta(minutes=1)
        )

        return JsonResponse({'link': f'{link.path}{link.key}'})

    return JsonResponse({'link': ''})
