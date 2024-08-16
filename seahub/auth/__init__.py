# Copyright (c) 2012-2016 Seafile Ltd.
import datetime
from importlib import import_module
from warnings import warn

from django.conf import settings
from django.core.exceptions import ImproperlyConfigured

from seahub.auth.signals import user_logged_in
from seahub.organizations.signals import org_last_activity

from constance import config
from seaserv import ccnet_api

SESSION_KEY = '_auth_user_name'
SESSION_USERS_LOGIN = '_already_loging_users'
BACKEND_SESSION_KEY = '_auth_user_backend_2'
REDIRECT_FIELD_NAME = 'next'
SESSION_MOBILE_LOGIN_KEY = "MOBILE_LOGIN"
MOBILE_SESSION_DAYS = 365


def load_backend(path):
    i = path.rfind('.')
    module, attr = path[:i], path[i+1:]
    try:
        mod = import_module(module)
    except ImportError as e:
        raise ImproperlyConfigured('Error importing authentication backend %s: "%s"' % (module, e))
    except ValueError as e:
        raise ImproperlyConfigured('Error importing authentication backends. Is AUTHENTICATION_BACKENDS a correctly defined list or tuple?')
    try:
        cls = getattr(mod, attr)
    except AttributeError:
        raise ImproperlyConfigured('Module "%s" does not define a "%s" authentication backend' % (module, attr))
    try:
        getattr(cls, 'supports_object_permissions')
    except AttributeError:
        warn("Authentication backends without a `supports_object_permissions` attribute are deprecated. Please define it in %s." % cls,
             PendingDeprecationWarning)
        cls.supports_object_permissions = False
    try:
        getattr(cls, 'supports_anonymous_user')
    except AttributeError:
        warn("Authentication backends without a `supports_anonymous_user` attribute are deprecated. Please define it in %s." % cls,
             PendingDeprecationWarning)
        cls.supports_anonymous_user = False
    return cls()

def get_backends():
    backends = []
    for backend_path in settings.AUTHENTICATION_BACKENDS:
        backends.append(load_backend(backend_path))
    return backends

def authenticate(**credentials):
    """
    If the given credentials are valid, return a User object.
    """
    for backend in get_backends():
        try:
            user = backend.authenticate(**credentials)
        except TypeError:
            # This backend doesn't accept these credentials as arguments. Try the next one.
            continue
        if user is None:
            continue
        # Annotate the user object with the path of the backend.
        user.backend = "%s.%s" % (backend.__module__, backend.__class__.__name__)
        return user

def login(request, user, mobile_login=False):
    """
    Persist a user id and a backend in the request. This way a user doesn't
    have to reauthenticate on every request.
    """
    if user is None:
        user = request.user
    # TODO: It would be nice to support different login methods, like signed cookies.
    user.last_login = datetime.datetime.now()

    # After each ADFS/SAML single sign-on is completed, `_saml2_subject_id` will be recorded in the session,
    # so that to distinguish ADFS/SAML users and local users when logging out.
    # Therefore, every time login, try to delete `_saml2_subject_id` from the session
    # to ensure that `_saml2_subject_id` is brand new and will not interfere with other users' logout.
    try:
        del request.saml_session['_saml2_subject_id']
    except:
        pass

    if SESSION_KEY in request.session:
        if request.session[SESSION_KEY] != user.username:
            # To avoid reusing another user's session, create a new, empty
            # session if the existing session corresponds to a different
            # authenticated user.
            request.session.flush()
    else:
        request.session.cycle_key()

    request.session[SESSION_KEY] = user.username
    request.session[BACKEND_SESSION_KEY] = user.backend

    if mobile_login:
        request.session[SESSION_MOBILE_LOGIN_KEY] = mobile_login
        request.session.set_expiry(MOBILE_SESSION_DAYS * 24 * 60 * 60)
    elif request.session.get('remember_me', False):
        request.session.set_expiry(config.LOGIN_REMEMBER_DAYS * 24 * 60 * 60)

    if hasattr(request, 'user'):
        request.user = user
    user_logged_in.send(sender=user.__class__, request=request, user=user)
    orgs = ccnet_api.get_orgs_by_user(user.username)
    if orgs:
        org_id = orgs[0].org_id
        org_last_activity.send(sender=user.__class__, org_id=org_id)

def logout(request):
    """
    Removes the authenticated user's ID from the request and flushes their
    session data.
    Also remove all passwords used to decrypt repos.
    """
    already_logged_list = request.session.get(SESSION_USERS_LOGIN, [])
    request.session.flush()
    if hasattr(request, 'user'):
        username = request.user.username
        if username not in already_logged_list:
            already_logged_list.append(username)
        request.session[SESSION_USERS_LOGIN] = already_logged_list
        from seahub.base.accounts import User
        if isinstance(request.user, User):
            # Do not directly/indirectly import models in package root level.
            from seahub.utils import is_org_context
            if is_org_context(request):
                org_id = request.user.org.org_id
                request.user.remove_org_repo_passwds(org_id)
            else:
                request.user.remove_repo_passwds()
        from seahub.auth.models import AnonymousUser
        request.user = AnonymousUser()

def get_user(request):
    from seahub.auth.models import AnonymousUser
    try:
        username = request.session[SESSION_KEY]
        backend_path = request.session[BACKEND_SESSION_KEY]
        backend = load_backend(backend_path)
        user = backend.get_user(username) or AnonymousUser()
    except KeyError:
        user = AnonymousUser()
    return user
