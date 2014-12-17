from django.db import connection
from django.contrib.auth.models import User, Permission
from django.contrib.auth.backends import RemoteUserBackend

class ShibbolethRemoteUserBackend(RemoteUserBackend):
    """
    This backend is to be used in conjunction with the ``RemoteUserMiddleware``
    found in the middleware module of this package, and is used when the server
    is handling authentication outside of Django.

    By default, the ``authenticate`` method creates ``User`` objects for
    usernames that don't already exist in the database.  Subclasses can disable
    this behavior by setting the ``create_unknown_user`` attribute to
    ``False``.
    """

    # Create a User object if not already in the database?
    create_unknown_user = True

    def authenticate(self, remote_user, shib_meta):
        """
        The username passed as ``remote_user`` is considered trusted.  This
        method simply returns the ``User`` object with the given username,
        creating a new ``User`` object if ``create_unknown_user`` is ``True``.

        Returns None if ``create_unknown_user`` is ``False`` and a ``User``
        object with the given username is not found in the database.
        """
        if not remote_user:
            return
        user = None
        username = self.clean_username(remote_user)
        shib_user_params = dict([(k, shib_meta[k]) for k in User._meta.get_all_field_names() if k in shib_meta])
        # Note that this could be accomplished in one try-except clause, but
        # instead we use get_or_create when creating unknown users since it has
        # built-in safeguards for multiple threads.
        if self.create_unknown_user:
            user, created = User.objects.get_or_create(username=shib_user_params.get('username'), defaults=shib_user_params)
            if created:
                user = self.configure_user(user)
        else:
            try:
                user = User.objects.get(**shib_user_params)
            except User.DoesNotExist:
                pass
        return user
