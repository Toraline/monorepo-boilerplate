from rest_framework import status
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from . import selectors


@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
def health(request):
    """Says that the server answers, and whether the database answers. Needs no login."""
    if selectors.database_answers():
        return Response({"status": "ok", "database": "ok"})
    return Response(
        {"status": "error", "database": "unavailable"},
        status=status.HTTP_503_SERVICE_UNAVAILABLE,
    )
