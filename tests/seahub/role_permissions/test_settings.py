from seahub.constants import DEFAULT_USER, GUEST_USER
from seahub.role_permissions.settings import (
    DEFAULT_ENABLED_ROLE_PERMISSIONS, ENABLED_ROLE_PERMISSIONS,
)


class TestMonthlyDownloadTrafficLimitKey:

    def test_default_role_permissions_use_renamed_keys(self):
        for role in (DEFAULT_USER, GUEST_USER):
            perms = DEFAULT_ENABLED_ROLE_PERMISSIONS[role]
            assert 'monthly_download_traffic_limit' in perms
            assert 'monthly_download_traffic_limit_per_user' in perms
            assert 'monthly_rate_limit' not in perms
            assert 'monthly_rate_limit_per_user' not in perms

    def test_enabled_role_permissions_use_renamed_keys(self):
        for role in (DEFAULT_USER, GUEST_USER):
            perms = ENABLED_ROLE_PERMISSIONS[role]
            assert 'monthly_download_traffic_limit' in perms
            assert 'monthly_download_traffic_limit_per_user' in perms
