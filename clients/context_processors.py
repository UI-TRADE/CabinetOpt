from .models import Organization

def organization(request):
    return {'organization': Organization.objects.first}