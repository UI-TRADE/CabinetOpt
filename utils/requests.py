from django.urls import reverse
from functools import wraps
from urllib.parse import urlencode

from shared_links.models import Link


def set_default_http_protocol(request, uri):
    if request.is_secure():
        return uri.replace('http://', 'https://')
    return uri


def clear_http_protocol(request, uri):
    return uri.replace('http://', '')


def get_uri(request, url, **kwargs):
    uri = request.build_absolute_uri(f'{reverse(url, kwargs=kwargs)}')
    return clear_http_protocol(request, uri.rstrip('/'))


def handle_get_params():
    def wrap(func):
        @wraps(func)
        def run_func(obj, request, *args, **kwargs):
            full_path = request.get_full_path()
            if urlencode(request.GET):
                full_path = full_path.replace(f'?{urlencode(request.GET)}', '')
            
            kwargs = kwargs | {'link': request.build_absolute_uri(f'{full_path}')}
            return func(obj, request, *args, **kwargs)
        return run_func
    return wrap


def handle_post_params():
    def wrap(func):
        @wraps(func)
        def run_func(obj, request, *args, **kwargs):
            link = None
            params = request.POST.dict()
            full_path = request.get_full_path()
            if params:
                link = Link.objects.create(
                    path = full_path,
                    param = {key: value for key, value in params.items() if key != 'csrfmiddlewaretoken'}
                )
            
            if urlencode(request.GET):
                full_path = full_path.replace(f'?{urlencode(request.GET)}', '')
            
            if link:
                kwargs = kwargs | {
                    'link': request.build_absolute_uri(
                        f'{full_path}{link.key}'
                )}
            else:
                kwargs = kwargs | {'link': request.build_absolute_uri(f'{full_path}')}

            return func(obj, request, *args, **kwargs)
        return run_func
    return wrap
