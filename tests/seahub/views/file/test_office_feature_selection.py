from unittest.mock import Mock, patch

from django.test import SimpleTestCase

from seahub.views.file import get_office_feature_by_repo

ONLYOFFICE_SUITE = [{'id': 'onlyoffice', 'is_default': True}]
COLLABORA_SUITE = [{'id': 'collabora', 'is_default': True}]
GROUP_OWNER = 'group@seafile_group'


class GetOfficeFeatureByRepoTest(SimpleTestCase):
    """Multiple-suite selection remains independent of the single-suite flag."""

    def setUp(self):
        self.repo = Mock()
        self.repo.repo_id = '0123456789abcdef0123456789abcdef01234567'

    def _call(self, suite_list, enable_onlyoffice, repo_feature=None):
        # A group owned library has no per-library suite config, so the default
        # suite of the office suite list is used. Any other owner reads the
        # suite stored for the library.
        if repo_feature:
            repo_owner = 'owner@seafile.com'
        else:
            repo_owner = GROUP_OWNER

        with patch('seahub.views.file.ENABLE_MULTIPLE_OFFICE_SUITE', True), \
                patch('seahub.views.file.OFFICE_SUITE_LIST', suite_list), \
                patch('seahub.views.file.ENABLE_ONLYOFFICE', enable_onlyoffice), \
                patch('seahub.views.file.get_org_id_by_repo_id', return_value=-1), \
                patch('seahub.views.file._check_feature', return_value=repo_feature), \
                patch('seahub.views.file.seafile_api') as mock_seafile_api:
            mock_seafile_api.get_repo_owner.return_value = repo_owner
            return get_office_feature_by_repo(self.repo)

    def test_default_onlyoffice_selected_without_single_suite_flag(self):
        enable_onlyoffice, enable_office_app = self._call(ONLYOFFICE_SUITE, False)

        self.assertTrue(enable_onlyoffice)
        self.assertFalse(enable_office_app)

    def test_onlyoffice_selected_when_enabled(self):
        enable_onlyoffice, enable_office_app = self._call(ONLYOFFICE_SUITE, True)

        self.assertTrue(enable_onlyoffice)
        self.assertFalse(enable_office_app)

    def test_library_onlyoffice_selected_without_single_suite_flag(self):
        enable_onlyoffice, _ = self._call(ONLYOFFICE_SUITE, False, repo_feature='onlyoffice')

        self.assertTrue(enable_onlyoffice)

    def test_collabora_selected_whatever_onlyoffice_is_enabled(self):
        enable_onlyoffice, enable_office_app = self._call(COLLABORA_SUITE, False)

        self.assertFalse(enable_onlyoffice)
        self.assertTrue(enable_office_app)
