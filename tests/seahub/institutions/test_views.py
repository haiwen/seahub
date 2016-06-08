from django.conf import settings
from django.core.urlresolvers import reverse
from django.http.cookie import parse_cookie
from django.test import override_settings

from seahub.institutions.models import Institution, InstitutionAdmin
from seahub.profile.models import Profile
from seahub.test_utils import BaseTestCase

settings.MIDDLEWARE_CLASSES += (
    'seahub.institutions.middleware.InstitutionMiddleware',
)


class InstTestBase(BaseTestCase):
    def setUp(self):
        self.inst = Institution.objects.create(name='inst_test')

        assert len(Profile.objects.all()) == 0
        p = Profile.objects.add_or_update(self.user.username, '')
        p.institution = self.inst.name
        p.save()

        p = Profile.objects.add_or_update(self.admin.username, '')
        p.institution = self.inst.name
        p.save()
        assert len(Profile.objects.all()) == 2

        InstitutionAdmin.objects.create(institution=self.inst,
                                        user=self.user.username)

class InfoTest(InstTestBase):
    @override_settings(
        MIDDLEWARE_CLASSES=settings.MIDDLEWARE_CLASSES,
        MULTI_INSTITUTION=True
    )
    def test_can_render(self):
        self.login_as(self.user)

        resp = self.client.get(reverse('institutions:info'))
        self.assertEqual(200, resp.status_code)
        assert resp.context['inst'] == self.inst


class UseradminTest(InstTestBase):
    @override_settings(
        MIDDLEWARE_CLASSES=settings.MIDDLEWARE_CLASSES,
        MULTI_INSTITUTION=True
    )
    def test_can_list(self):
        self.login_as(self.user)
        resp = self.client.get(reverse('institutions:useradmin'))
        self.assertEqual(200, resp.status_code)
        assert resp.context['inst'] == self.inst
        assert len(resp.context['users']) == 2


class UseradminSearchTest(InstTestBase):
    @override_settings(
        MIDDLEWARE_CLASSES=settings.MIDDLEWARE_CLASSES,
        MULTI_INSTITUTION=True
    )
    def test_can_search(self):
        self.login_as(self.user)
        resp = self.client.get(reverse('institutions:useradmin_search') + '?q=@')
        self.assertEqual(200, resp.status_code)
        assert resp.context['inst'] == self.inst
        assert len(resp.context['users']) == 2
        assert resp.context['q'] == '@'
