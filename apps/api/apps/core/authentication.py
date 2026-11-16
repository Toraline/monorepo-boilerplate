from rest_framework import authentication


class CsrfSessionAuthentication(authentication.SessionAuthentication):
    """The login of a request is the Django session, kept in the cookie "sessionid".

    Two differences from the class of Django REST Framework:

    1. The CSRF token is checked on every request that changes data, also when
       nobody is logged in. This protects the login request itself.
    2. A request with no login to a protected address gets status 401, not 403.
       403 then always means "logged in, but not allowed" or "the CSRF token is
       missing or wrong".
    """

    def authenticate(self, request):
        # Does nothing for GET, HEAD and OPTIONS.
        self.enforce_csrf(request)
        user = getattr(request._request, "user", None)
        if not user or not user.is_active:
            return None
        return (user, None)

    def authenticate_header(self, request):
        # Django REST Framework answers 401 only when this returns a value.
        return "Session"
