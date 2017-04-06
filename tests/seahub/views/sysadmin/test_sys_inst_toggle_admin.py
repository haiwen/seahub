from django.core.urlresolvers import reverse

from seahub.institutions.models import Institution, InstitutionAdmin
from seahub.profile.models import Profile
from seahub.test_utils import BaseTestCase

class SysInstInfoUserTest(BaseTestCase):
    def setUp(self):
        self.login_as(self.admin)

        self.inst = Institution.objects.create(name='inst_test')

        assert len(Profile.objects.all()) == 0
        p = Profile.objects.add_or_update(self.user.username, '')
        p.institution = self.inst.name
        p.save()
        assert len(Profile.objects.all()) == 1

        self.url = reverse('sys_inst_toggle_admin', args=[self.inst.pk,
                                                          self.user.username])

    def test_can_set_and_revoke_admin(self):
        assert len(InstitutionAdmin.objects.filter(institution=self.inst)) == 0
        resp = self.client.post(self.url)
        self.assertEqual(302, resp.status_code)
        assert 'Success' in resp.cookies['messages'].value

        assert len(InstitutionAdmin.objects.filter(institution=self.inst)) == 1

        resp = self.client.post(self.url)
        self.assertEqual(302, resp.status_code)
        assert 'Success' in resp.cookies['messages'].value

        assert len(InstitutionAdmin.objects.filter(institution=self.inst)) == 0
