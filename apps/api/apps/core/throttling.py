"""The limit on login attempts: the API login and the login page of the Django admin."""

from django.conf import settings
from django.contrib import admin
from django.http import HttpResponse
from rest_framework.throttling import SimpleRateThrottle

TOO_MANY_LOGIN_ATTEMPTS = "Too many login attempts from this address. Wait, then try again."


class LoginRateThrottle(SimpleRateThrottle):
    """Counts the login attempts of one network address (IP).

    The limit is the setting LOGIN_THROTTLE_RATE, for example "10/minute". The
    API login and the admin login share one count. The address is the one that
    connects to the server; the setting NUM_PROXIES says how many proxies are
    in front of the server, so the address of the person is used and not the
    address of the proxy.
    """

    scope = "login"

    def get_rate(self):
        return settings.LOGIN_THROTTLE_RATE

    def get_cache_key(self, request, view):
        return self.cache_format % {"scope": self.scope, "ident": self.get_ident(request)}


def admin_login(request, extra_context=None):
    """The login page of the Django admin, with the same limit as the API login.

    Opening the page is not counted. Sending the form is.
    """
    if request.method == "POST" and not LoginRateThrottle().allow_request(request, None):
        return HttpResponse(TOO_MANY_LOGIN_ATTEMPTS, status=429, content_type="text/plain")
    return admin.site.login(request, extra_context)
