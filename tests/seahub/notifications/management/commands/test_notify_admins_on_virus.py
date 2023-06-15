from django.core import mail
from django.core.management import call_command
from django.urls import path
from django.test import override_settings

import seahub
from seahub import urls
from seahub.test_utils import BaseTestCase
from seahub.views.sysadmin import sysadmin_react_fake_view

urlpatterns = seahub.urls.urlpatterns + [
    path('sys/virus-scan-records/', sysadmin_react_fake_view, name='sys_virus_scan_records'),
]

@override_settings(ROOT_URLCONF=__name__)
class CommandTest(BaseTestCase):

    def test_can_send(self):
        self.assertEqual(len(mail.outbox), 0)

        call_command('notify_admins_on_virus', "%s:%s" % (self.repo.id, self.file))
        assert len(mail.outbox) != 0

    def test_can_send_to_repo_owner(self):
        self.assertEqual(len(mail.outbox), 0)

        call_command('notify_admins_on_virus', "%s:%s" % (self.repo.id, self.file))
        assert len(mail.outbox) != 0
        assert self.user.username in [e.to[0] for e in mail.outbox]

    @override_settings(VIRUS_SCAN_NOTIFY_LIST=['a@a.com', 'b@b.com'])
    def test_can_send_to_nofity_list(self):
        self.assertEqual(len(mail.outbox), 0)

        call_command('notify_admins_on_virus', "%s:%s" % (self.repo.id, self.file))
        assert len(mail.outbox) != 0
        assert 'a@a.com' in [e.to[0] for e in mail.outbox]
        assert 'b@b.com' in [e.to[0] for e in mail.outbox]
