# Copyright (c) 2012-2016 Seafile Ltd.
import logging

from django.contrib import messages
from django.http import HttpResponseRedirect, Http404
from django.shortcuts import get_object_or_404, render

from django.utils.translation import gettext as _
from seaserv import seafile_api

from seahub.auth import login as auth_login, authenticate
from seahub.auth import get_backends
from seahub.auth.utils import get_virtual_id_by_email
from seahub.base.accounts import User
from seahub.constants import GUEST_USER
from seahub.invitations.models import Invitation, RepoShareInvitation
from seahub.invitations.signals import accept_guest_invitation_successful
from seahub.settings import SITE_ROOT, NOTIFY_ADMIN_AFTER_REGISTRATION
from registration.models import notify_admins_on_register_complete
from seahub.utils import send_perm_audit_msg
from seahub.share.utils import share_dir_to_user

logger = logging.getLogger(__name__)


def token_view(request, token):
    """Show form to let user set password.
    """
    i = get_object_or_404(Invitation, token=token)
    if i.is_expired():
        raise Http404

    vid = get_virtual_id_by_email(i.accepter)
    if request.method == 'GET':
        try:
            user = User.objects.get(email=vid)
            if user.is_active is True:
                # user is active return exist
                messages.error(request, _('A user with this email already exists.'))
        except User.DoesNotExist:
            pass

        return render(request, 'invitations/token_view.html', {'iv': i, })

    if request.method == 'POST':
        passwd = request.POST.get('password', '')
        if not passwd:
            return HttpResponseRedirect(request.headers.get('referer'))

        try:
            user = User.objects.get(email=vid)
            if user.is_active is True:
                # user is active return exist
                messages.error(request, _('A user with this email already exists.'))
                return render(request, 'invitations/token_view.html', {'iv': i, })
            else:
                # user is inactive then set active and new password
                user.set_password(passwd)
                user.is_active = True
                user.save()
                user = authenticate(username=user.username, password=passwd)

        except User.DoesNotExist:
            # Create user, set that user as guest.
            user = User.objects.create_user(
                email=i.accepter, password=passwd, is_active=True)
            User.objects.update_role(user.username, GUEST_USER)
            for backend in get_backends():
                user.backend = "%s.%s" % (backend.__module__, backend.__class__.__name__)

        # Update invitation accept time.
        i.accept()

        # login
        auth_login(request, user)

        # send signal to notify inviter
        accept_guest_invitation_successful.send(
            sender=None, invitation_obj=i)

        # send email to notify admin
        if NOTIFY_ADMIN_AFTER_REGISTRATION:
            notify_admins_on_register_complete(user.email)

        # repo share invitation
        try:
            shared_queryset = RepoShareInvitation.objects.list_by_invitation(invitation=i)
            accepter = user.username

            for shared_obj in shared_queryset:
                repo_id = shared_obj.repo_id
                path = shared_obj.path
                permission = shared_obj.permission
                inviter = shared_obj.invitation.inviter

                # recourse check
                repo = seafile_api.get_repo(repo_id)
                if not repo:
                    logger.warning('[ %s ] repo not found when [ %s ] accepts the invitation to share repo') % (repo_id, accepter)
                    continue
                if seafile_api.get_dir_id_by_path(repo.id, path) is None:
                    logger.warning('[ %s ][ %s ] dir not found when [ %s ] accepts the invitation to share repo') % (repo_id, path, accepter)
                    continue

                repo_owner = seafile_api.get_repo_owner(repo_id)
                share_dir_to_user(repo, path, repo_owner, 
                    inviter, accepter, permission, None)

                send_perm_audit_msg('modify-repo-perm', 
                    inviter, accepter, repo_id, path, permission)

            # delete
            shared_queryset.delete()
        except Exception as e:
            logger.error(e)

        return HttpResponseRedirect(SITE_ROOT)
