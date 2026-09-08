from unittest.mock import Mock, patch

from django.http import HttpResponse
from django.test import SimpleTestCase

from seahub.two_factor.forms import TOTPDeviceAlreadyExists, TOTPDeviceForm
from seahub.two_factor.views.core import SetupView


class SetupViewTest(SimpleTestCase):

    @patch('seahub.two_factor.views.core.two_factor_login')
    def test_done_redisplays_form_when_another_setup_already_created_a_device(
            self, mock_two_factor_login):
        view = SetupView()
        view.get_method = Mock(return_value='generator')
        view.render = Mock(return_value=HttpResponse('conflict'))
        view.request = Mock()
        form = Mock(spec=TOTPDeviceForm)
        form.save.side_effect = TOTPDeviceAlreadyExists()

        response = view.done([form])

        self.assertEqual(response.content, b'conflict')
        form.add_error.assert_called_once_with(
            None,
            'Two-factor authentication is already enabled for this account. '
            'Please use the existing authenticator to sign in.',
        )
        mock_two_factor_login.assert_not_called()
