from django.urls import reverse


def get_uri(request, url, **kwargs):
    uri = request.build_absolute_uri(f'{reverse(url, kwargs=kwargs)}')
    return uri.rstrip('/')