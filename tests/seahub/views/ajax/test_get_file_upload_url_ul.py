import json

from django.core.urlresolvers import reverse

from seahub.share.models import UploadLinkShare
from seahub.test_utils import BaseTestCase

try:
    from seahub.settings import LOCAL_PRO_DEV_ENV
except ImportError:
    LOCAL_PRO_DEV_ENV = False

class GetDirentsTest(BaseTestCase):
    def setUp(self):
        upload_link = UploadLinkShare.objects.create_upload_link_share(self.user.username,
            self.repo.id, self.folder, None, None)

        self.url = reverse('get_file_upload_url_ul', args=[upload_link.token]) + '?r=' + self.repo.id

    def test_can_get_with_login_user(self):
        if not LOCAL_PRO_DEV_ENV:
            return

        self.login_as(self.user)
        resp = self.client.get(self.url, HTTP_X_REQUESTED_WITH='XMLHttpRequest')
        json_resp = json.loads(resp.content)
        assert 'upload-aj' in json_resp['url']

    def test_can_get_with_unlogin_user(self):
        if not LOCAL_PRO_DEV_ENV:
            return

        resp = self.client.get(self.url, HTTP_X_REQUESTED_WITH='XMLHttpRequest')
        json_resp = json.loads(resp.content)
        assert 'upload-aj' in json_resp['url']

    def test_can_get_with_anonymous_email_in_session(self):
        if not LOCAL_PRO_DEV_ENV:
            return

        session = self.client.session
        session['anonymous_email'] = 'anonymous@email.com'
        session.save()
        resp = self.client.get(self.url, HTTP_X_REQUESTED_WITH='XMLHttpRequest')
        json_resp = json.loads(resp.content)
        assert 'upload-aj' in json_resp['url']
