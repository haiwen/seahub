from seahub.test_utils import BaseTestCase

from seahub.role_permissions.settings import merge_roles

K1 = 'k1'
K2 = 'k2'

class SettingsTest(BaseTestCase):
    def test_merge_rols(self, ):
        default = {
            'default': {
                K1: True,
                K2: True,
            },
        }

        custom = {
            'default': {
                K1: False,
                K2: False,
            },
            'custom': {
                K1: True,
            }
        }

        merged = merge_roles(default, custom)
        assert merged['default'][K1] is False
        assert merged['default'][K2] is False
        assert merged['custom'][K1] is True
        assert merged['custom'][K2] is True
