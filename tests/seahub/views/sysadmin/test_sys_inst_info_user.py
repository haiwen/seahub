from django.core.urlresolvers import reverse

from seahub.institutions.models import Institution
from seahub.profile.models import Profile
from seahub.test_utils import BaseTestCase

class SysInstInfoUserTest(BaseTestCase):
    def setUp(self):
        self.login_as(self.admin)

        self.inst = Institution.objects.create(name='inst_test')
        self.url = reverse('sys_inst_info_users', args=[self.inst.pk])

        assert len(Profile.objects.all()) == 0
        p = Profile.objects.add_or_update(self.user.username, '')
        p.institution = self.inst.name
        p.save()

        p = Profile.objects.add_or_update(self.admin.username, '')
        p.institution = self.inst.name
        p.save()
        assert len(Profile.objects.all()) == 2

    def test_can_list(self):
        resp = self.client.get(self.url)

        self.assertTemplateUsed('sysadmin/sys_inst_info_users.html')
        assert resp.context['inst'] == self.inst
        assert len(resp.context['users']) == 2
