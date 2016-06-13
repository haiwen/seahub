from django.core.urlresolvers import reverse

from seahub.institutions.models import Institution
from seahub.profile.models import Profile
from seahub.test_utils import BaseTestCase


class SysInstSearchUser(BaseTestCase):
    def setUp(self):
        self.inst = Institution.objects.create(name='test_inst')

        assert len(Profile.objects.all()) == 0
        p = Profile.objects.add_or_update(self.user.username, '')
        p.institution = self.inst.name
        p.save()

        p = Profile.objects.add_or_update(self.admin.username, '')
        p.institution = self.inst.name
        p.save()
        assert len(Profile.objects.all()) == 2

        self.url = reverse('sys_inst_search_user', args=[self.inst.id])

    def test_can_search(self):
        self.login_as(self.admin)

        resp = self.client.get(self.url + '?q=@')
        self.assertEqual(200, resp.status_code)

        assert len(resp.context['users']) == 2
        assert resp.context['q'] == '@'
