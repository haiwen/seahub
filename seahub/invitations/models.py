# Copyright (c) 2012-2016 Seafile Ltd.
from datetime import timedelta

from django.db import models
from django.utils import timezone
from django.utils.translation import gettext as _

from seahub.base.fields import LowerCaseCharField
from seahub.invitations.settings import INVITATIONS_TOKEN_AGE
from seahub.utils import gen_token, get_site_name
from seahub.utils.timeutils import datetime_to_isoformat_timestr
from seahub.utils.mail import send_html_email_with_dj_template
from seahub.constants import PERMISSION_READ, PERMISSION_READ_WRITE

GUEST = 'Guest'


class InvitationManager(models.Manager):
    def add(self, inviter, accepter, invite_type=GUEST):
        token = gen_token(max_length=32)
        expire_at = timezone.now() + timedelta(hours=int(INVITATIONS_TOKEN_AGE))

        i = self.model(token=token, inviter=inviter, accepter=accepter,
                       invite_type=invite_type, expire_time=expire_at)
        i.save(using=self._db)
        return i

    def get_by_inviter(self, inviter):
        return super(InvitationManager, self).filter(inviter=inviter).order_by('-invite_time')

    def delete_all_expire_invitation(self):
        super(InvitationManager, self).filter(expire_time__lte=timezone.now(), accept_time__isnull=True).delete()

    def get_by_token(self, token):
        qs = self.filter(token=token)
        if qs.count() > 0:
            return qs[0]
        return None


class Invitation(models.Model):
    INVITE_TYPE_CHOICES = (
        (GUEST, 'Guest'),
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

        context = self.to_dict()
        context['site_name'] = get_site_name()

        subject = _('You are invited to join %(site_name)s.') % {'site_name': get_site_name()}

        return send_html_email_with_dj_template(email,
                                                subject=subject,
                                                dj_template='invitations/invitation_email.html',
                                                context=context)


class RepoShareInvitationManager(models.Manager):
    def add(self, invitation, repo_id, path, permission):
        obj = self.model(
            invitation=invitation,
            repo_id=repo_id,
            path=path,
            permission=permission,
        )
        obj.save()
        return obj

    def list_by_repo_id_and_path(self, repo_id, path):
        return self.select_related('invitation').filter(
            invitation__expire_time__gte=timezone.now(),
            invitation__accept_time=None,
            repo_id=repo_id,
            path=path,
            )

    def get_by_token_and_path(self, token, repo_id, path):
        qs = self.select_related('invitation').filter(
            invitation__token=token, repo_id=repo_id, path=path,
            )
        if qs.exists():
            return qs[0]
        else:
            return None

    def list_by_invitation(self, invitation):
        return self.select_related('invitation').filter(invitation=invitation)


class RepoShareInvitation(models.Model):

    PERMISSION_CHOICES = (
        (PERMISSION_READ, 'read only'),
        (PERMISSION_READ_WRITE, 'read and write')
    )

    invitation = models.ForeignKey(Invitation, on_delete=models.CASCADE, related_name='repo_share')
    repo_id = models.CharField(max_length=36, db_index=True)
    path = models.TextField()
    permission = models.CharField(
        max_length=50, choices=PERMISSION_CHOICES, default=PERMISSION_READ)

    objects = RepoShareInvitationManager()

    class Meta:
        db_table = 'repo_share_invitation'
