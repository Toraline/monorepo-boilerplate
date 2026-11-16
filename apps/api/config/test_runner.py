"""The test runner of apps/api (the setting TEST_RUNNER)."""

from django.conf import settings
from django.test.runner import DiscoverRunner

# So many tests log in from one address in a few seconds that the limit of a
# real server would refuse most of them.
LOGIN_THROTTLE_RATE_OF_THE_TESTS = "100000/minute"


class TestRunner(DiscoverRunner):
    """Runs the tests with a login limit that the tests never reach.

    The tests of the limit itself (apps/core/tests/test_throttling.py) set a
    low limit for their own requests.
    """

    def setup_test_environment(self, **kwargs):
        super().setup_test_environment(**kwargs)
        self.login_throttle_rate_before = settings.LOGIN_THROTTLE_RATE
        settings.LOGIN_THROTTLE_RATE = LOGIN_THROTTLE_RATE_OF_THE_TESTS

    def teardown_test_environment(self, **kwargs):
        settings.LOGIN_THROTTLE_RATE = self.login_throttle_rate_before
        super().teardown_test_environment(**kwargs)
