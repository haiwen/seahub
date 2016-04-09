from django.core.urlresolvers import reverse

from seahub.institutions.models import Institution
from seahub.test_utils import BaseTestCase

class SysInstAdminTest(BaseTestCase):
    def setUp(self):
        self.login_as(self.admin)
        self.url = reverse('sys_inst_admin')

    def test_can_add(self):
        resp = self.client.post(self.url, {
            'name': 'inst1'
        })

        self.assertEqual(302, resp.status_code)
        self.assertRedirects(resp, reverse('sys_inst_admin'))

    def test_can_list(self):
        for i in range(4):
            Institution.objects.create(name='inst %d' % i)

        resp = self.client.get(self.url + '?per_page=2')

        assert len(resp.context['insts']) == 2
        assert resp.context['page_next'] is True
        self.assertEqual(200, resp.status_code)
        self.assertTemplateUsed('sysadmin/sys_inst_admin.html')

        resp = self.client.get(self.url + '?per_page=2&page=2')
        assert len(resp.context['insts']) == 2
        assert resp.context['page_next'] is False
