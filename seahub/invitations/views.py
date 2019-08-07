# Copyright (c) 2012-2016 Seafile Ltd.
from django.contrib import messages
from django.http import HttpResponseRedirect, Http404
from django.shortcuts import get_object_or_404, render

from django.utils.translation import ugettext as _

from seahub.auth import login as auth_login, authenticate
from seahub.auth import get_backends
from seahub.base.accounts import User
from seahub.constants import GUEST_USER
from seahub.invitations.models import Invitation
from seahub.invitations.signals import accept_guest_invitation_successful
from seahub.settings import SITE_ROOT, NOTIFY_ADMIN_AFTER_REGISTRATION
from registration.models import notify_admins_on_register_complete

def token_view(request, token):
    """Show form to let user set password.
    """
    i = get_object_or_404(Invitation, token=token)
    if i.is_expired():
        raise Http404

    if request.method == 'GET':
        try:
            user = User.objects.get(email=i.accepter)
            if user.is_active is True:
                # user is active return exist
                messages.error(request, _('A user with this email already exists.'))
        except User.DoesNotExist:
            pass

        return render(request, 'invitations/token_view.html', {'iv': i, })

    if request.method == 'POST':
        passwd = request.POST.get('password', '')
        if not passwd:
            return HttpResponseRedirect(request.META.get('HTTP_REFERER'))

        try:
            user = User.objects.get(email=i.accepter)
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

        return HttpResponseRedirect(SITE_ROOT)
