from datetime import timedelta

from django.db import models
from django.template.loader import render_to_string
from django.utils import timezone
from django.utils.translation import ugettext as _

from seahub.base.fields import LowerCaseCharField
from seahub.invitations.settings import INVITATIONS_TOKEN_AGE
from seahub.utils import gen_token
from seahub.utils.timeutils import datetime_to_isoformat_timestr
from seahub.utils.mail import send_html_email_with_dj_template, MAIL_PRIORITY
from seahub.settings import SITE_NAME

GUEST = _('Guest')

class InvitationManager(models.Manager):
    def add(self, inviter, accepter, invite_type=GUEST):
        token = gen_token(max_length=32)
        expire_at = timezone.now() + timedelta(hours=INVITATIONS_TOKEN_AGE)

        i = self.model(token=token, inviter=inviter, accepter=accepter,
                       invite_type=invite_type, expire_time=expire_at)
        i.save(using=self._db)
        return i

    def get_by_inviter(self, inviter):
        return super(InvitationManager, self).filter(inviter=inviter)

class Invitation(models.Model):
    INVITE_TYPE_CHOICES = (
        (GUEST, _('Guest')),
    )

    token = models.CharField(max_length=40, db_index=True)
    inviter = LowerCaseCharField(max_length=255, db_index=True)
    accepter = LowerCaseCharField(max_length=255)
    invite_type = models.CharField(max_length=20,
                                   choices=INVITE_TYPE_CHOICES,
                                   default=GUEST)
    invite_time = models.DateTimeField(auto_now_add=True)
    accept_time = models.DateTimeField(null=True, blank=True)
    expire_time = models.DateTimeField()
    objects = InvitationManager()

    def __unicode__(self):
        return "Invitation from %s on %s (%s)" % (
            self.inviter, self.invite_time, self.token)

    def accept(self):
        self.accept_time = timezone.now()
        self.save()

    def to_dict(self):
        accept_time = datetime_to_isoformat_timestr(self.accept_time) \
                      if self.accept_time else ""
        return {
            "id": self.pk,
            "token": self.token,
            "inviter": self.inviter,
            "accepter": self.accepter,
            "type": self.invite_type,
            "invite_time": datetime_to_isoformat_timestr(self.invite_time),
            "accept_time": accept_time,
            "expire_time": datetime_to_isoformat_timestr(self.expire_time),
        }

    def is_guest(self):
        return self.invite_type == GUEST

    def is_expired(self):
        return timezone.now() >= self.expire_time

    def send_to(self, email=None):
        """
        Send an invitation email to ``email``.
        """
        if not email:
            email = self.accepter

        context = {
            'inviter': self.inviter,
            'site_name': SITE_NAME,
            'token': self.token,
        }
        subject = render_to_string('invitations/invitation_email_subject.txt',
                                   context)

        send_html_email_with_dj_template(
            email, dj_template='invitations/invitation_email.html',
            context=context,
            subject=subject,
            priority=MAIL_PRIORITY.now
        )
