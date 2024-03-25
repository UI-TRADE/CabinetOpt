def set_default_http_protocol(request, uri):
    if request.is_secure():
        return uri.replace('http://', 'https://')
    return uri
