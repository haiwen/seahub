from django.core import mail
from django.conf import settings
from django.urls import reverse
from django.test import override_settings

from seahub.base.accounts import User
from seahub.institutions.models import Institution, InstitutionAdmin
from seahub.institutions.utils import is_institution_admin
from seahub.profile.models import Profile
from seahub.test_utils import BaseTestCase

settings.MIDDLEWARE.append(
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
        MIDDLEWARE=settings.MIDDLEWARE,
        MULTI_INSTITUTION=True
    )
    def test_can_render(self):
        self.login_as(self.user)

        resp = self.client.get(reverse('institutions:info'))
        self.assertEqual(200, resp.status_code)
        assert resp.context['inst'] == self.inst


class UseradminTest(InstTestBase):
    @override_settings(
        MIDDLEWARE=settings.MIDDLEWARE,
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
        MIDDLEWARE=settings.MIDDLEWARE,
        MULTI_INSTITUTION=True
    )
    def test_can_search(self):
        self.login_as(self.user)
        resp = self.client.get(reverse('institutions:useradmin_search') + '?q=@')
        self.assertEqual(200, resp.status_code)
        assert resp.context['inst'] == self.inst
        assert len(resp.context['users']) == 2
        assert resp.context['q'] == '@'


class UserToggleStatusTest(InstTestBase):
    @override_settings(
        MIDDLEWARE=settings.MIDDLEWARE,
        MULTI_INSTITUTION=True
    )
    def test_can_activate(self):
        self.login_as(self.user)
        self.assertEqual(len(mail.outbox), 0)

        old_passwd = self.admin.enc_password
        resp = self.client.post(
            reverse('institutions:user_toggle_status', args=[self.admin.username]),
            {'s': 1},
            HTTP_X_REQUESTED_WITH='XMLHttpRequest'
        )
        self.assertEqual(200, resp.status_code)
        self.assertContains(resp, '"success": true')

        u = User.objects.get(email=self.admin.username)
        assert u.is_active is True
        assert u.enc_password == old_passwd
        self.assertEqual(len(mail.outbox), 1)

    @override_settings(
        MIDDLEWARE=settings.MIDDLEWARE,
        MULTI_INSTITUTION=True
    )
    def test_can_deactivate(self):
        self.login_as(self.user)

        old_passwd = self.admin.enc_password
        resp = self.client.post(
            reverse('institutions:user_toggle_status', args=[self.admin.username]),
            {'s': 0},
            HTTP_X_REQUESTED_WITH='XMLHttpRequest'
        )
        self.assertEqual(200, resp.status_code)
        self.assertContains(resp, '"success": true')

        u = User.objects.get(email=self.admin.username)
        assert u.is_active is False
        assert u.enc_password == old_passwd


class UserIsAdminTest(InstTestBase):
    @override_settings(
        MIDDLEWARE=settings.MIDDLEWARE,
        MULTI_INSTITUTION=True
    )

    def test_is_institution_admin(self):
        assert is_institution_admin(self.user.username) == True
        assert is_institution_admin(self.admin.username) == False
        assert is_institution_admin(self.user.username, self.inst) == True
        assert is_institution_admin(self.admin.username, self.inst) == False
