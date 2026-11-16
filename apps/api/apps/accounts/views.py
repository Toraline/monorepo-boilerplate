from django.middleware.csrf import get_token
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response

from apps.core.pagination import paged_response

from . import selectors, services
from .serializers import LoginSerializer, UserSerializer, UserSummarySerializer

# One message for an unknown email, a wrong password and a user who was turned
# off, so the answer does not say which emails exist.
LOGIN_FAILED = "The email or the password is not correct."


@api_view(["GET"])
@permission_classes([AllowAny])
def csrf(request):
    """Gives the CSRF token: in the answer, and in the cookie "csrftoken"."""
    return Response({"csrfToken": get_token(request)})


@api_view(["POST"])
@permission_classes([AllowAny])
def login(request):
    serializer = LoginSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    user = services.log_in(request, **serializer.validated_data)
    if user is None:
        return Response({"detail": LOGIN_FAILED}, status=status.HTTP_401_UNAUTHORIZED)
    return Response(UserSerializer(user).data)


@api_view(["POST"])
def logout(request):
    services.log_out(request)
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["GET"])
def me(request):
    """Who am I: the user of the login session."""
    return Response(UserSerializer(request.user).data)


@api_view(["GET"])
@permission_classes([IsAdminUser])
def users(request):
    """Every user, in pages, for an admin. The internal app fills its owner filter with it."""
    return paged_response(request, selectors.users(), UserSummarySerializer)
