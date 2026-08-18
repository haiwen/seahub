# Copyright (c) 2012-2016 Seafile Ltd.
from django.conf import settings
from django.contrib.auth.backends import RemoteUserBackend

import seaserv

from seahub.base.accounts import User
from seahub.auth.models import SocialAuthUser
from seahub.utils.auth import KRB5_PROVIDER


class RemoteKrbBackend(RemoteUserBackend):
    """
    This backend is to be used in conjunction with the ``RemoteUserMiddleware``
    found in the middleware module of this package, and is used when the server
    is handling authentication outside of Django.

    By default, the ``authenticate`` method creates ``User`` objects for
    usernames that don't already exist in the database.  Subclasses can disable
    this behavior by setting the ``create_unknown_user`` attribute to
    ``False``.
    """

    create_unknown_user = getattr(settings, 'KRB5_CREATE_UNKNOWN_USER', False)

    def get_user(self, username):
        emailuser = seaserv.get_emailuser_with_import(username)
        if not emailuser:
            return None

        user = User(emailuser.email)
        user.id = emailuser.id
        user.enc_password = emailuser.password
        user.is_staff = emailuser.is_staff
        user.is_active = emailuser.is_active
        user.ctime = emailuser.ctime
        user.org = emailuser.org
        user.source = emailuser.source
        user.role = emailuser.role
        user.source = emailuser.source

        return user

    def authenticate(self, remote_user):
        if not remote_user:
            return
        user = None
        username = self.clean_username(remote_user)

        user = self.get_user(username)
        if not user:
            if self.create_unknown_user:
                user = User.objects.create_krb_user(email=username,
                                                    is_active=True)
            else:
                pass

        if user:
            # Persist the Kerberos authentication source for later policy checks.
            SocialAuthUser.objects.add_if_not_exists(
                user.username, KRB5_PROVIDER, user.username)

        return user
