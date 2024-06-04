from django.db import transaction
from django.contrib.auth import authenticate, get_user_model
from django.http import JsonResponse

from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.authtoken.models import Token
from rest_framework.response import Response

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated

from rest_framework.serializers import ModelSerializer


class UserSerializer(ModelSerializer):

    class Meta:
        model = get_user_model()
        fields = '__all__'


class AuthToken(ObtainAuthToken):

    def post(self, request, *args, **kwargs):
        serializer = self.serializer_class(data=request.data,
                                        context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        token, _ = Token.objects.get_or_create(user=user)
        return Response({
            'token': token.key,
            'user_id': user.pk,
            'email': user.email
        })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_users(request):
    errors = []
    for user in request.data:
        serializer = UserSerializer(data=user)
        if not serializer.is_valid():
            for key, value in serializer.errors.items():
                errors.append({key: "; ".join([i.title() for i in value])})    
            continue

        with transaction.atomic():
            user_model = get_user_model()
            user_data = {key: value for key, value in serializer.validated_data.items()}
            user, _ = user_model.objects.update_or_create(
                username=user_data['username'],
                defaults=user_data
            )

    if errors:
        return JsonResponse(
            errors,
            status=200,
            safe=False,
            json_dumps_params={'ensure_ascii': False}
        )
    return JsonResponse({'replay': 'ok'}, status=200)
