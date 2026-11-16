import os
from unittest import mock

from django.core.exceptions import ImproperlyConfigured
from django.test import SimpleTestCase

from config.env import env_bool, env_list, env_required


class EnvTests(SimpleTestCase):
    def test_required_value_is_returned(self):
        with mock.patch.dict(os.environ, {"SAMPLE_NAME": " value "}):
            self.assertEqual(env_required("SAMPLE_NAME"), "value")

    def test_missing_required_value_names_the_variable(self):
        with mock.patch.dict(os.environ, {}, clear=True):
            with self.assertRaisesMessage(ImproperlyConfigured, "SAMPLE_NAME is not set"):
                env_required("SAMPLE_NAME")

    def test_bool_is_the_default_when_missing(self):
        with mock.patch.dict(os.environ, {}, clear=True):
            self.assertFalse(env_bool("SAMPLE_FLAG", default=False))
            self.assertTrue(env_bool("SAMPLE_FLAG", default=True))

    def test_bool_reads_true_and_false(self):
        with mock.patch.dict(os.environ, {"SAMPLE_FLAG": "True"}):
            self.assertTrue(env_bool("SAMPLE_FLAG", default=False))
        with mock.patch.dict(os.environ, {"SAMPLE_FLAG": "False"}):
            self.assertFalse(env_bool("SAMPLE_FLAG", default=True))

    def test_list_splits_on_commas_and_drops_empty_items(self):
        with mock.patch.dict(os.environ, {"SAMPLE_LIST": "a, b,,c "}):
            self.assertEqual(env_list("SAMPLE_LIST"), ["a", "b", "c"])
        with mock.patch.dict(os.environ, {}, clear=True):
            self.assertEqual(env_list("SAMPLE_LIST"), [])
