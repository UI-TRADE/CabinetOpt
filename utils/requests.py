from django.urls import reverse


def set_default_http_protocol(request, uri):
    if request.is_secure():
        return uri.replace('http://', 'https://')
    return uri


def get_uri(request, url, **kwargs):
    uri = request.build_absolute_uri(f'{reverse(url, kwargs=kwargs)}')
    return set_default_http_protocol(request, uri.rstrip('/'))
