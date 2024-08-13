from contextlib import suppress
from django.http import JsonResponse
from rest_framework.decorators import api_view

from .models import Link

@api_view(['GET'])
def update_session_storage(request, key):
    with suppress(Link.DoesNotExist):
        obj = Link.objects.get(key=key)
        return JsonResponse({'replay': 'ok', 'code': '200', 'path': obj.path} | obj.param)
    return JsonResponse({'replay': 'error', 'code': '404', 'description': 'url not defined'})
