"""CAS authentication backend"""
import logging

from django.contrib.auth.backends import ModelBackend
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured

from .signals import cas_user_authenticated
from .utils import get_cas_client

from seahub.base.accounts import User
from seahub.auth.models import SocialAuthUser
try:
    from seahub.settings import CAS_SEAFILE_DOMAIN
except ImportError:
    CAS_SEAFILE_DOMAIN = 'seafile.local'

__all__ = ['CASBackend']

logger = logging.getLogger(__name__)


class CASBackend(ModelBackend):
    """CAS authentication backend"""

    def get_user(self, username):
        try:
            user = User.objects.get(email=username)
        except User.DoesNotExist:
            user = None
        return user

    def authenticate(self, request, ticket=None, service=None, **kwargs):
        """Verifies CAS ticket and gets or creates User object"""
        if ticket is None or service is None:
            logger.error('ticket or service are None')
            return None

        client = get_cas_client(service_url=service, request=request)
        username, attributes, pgtiou = client.verify_ticket(ticket)
        if attributes and request:
            request.session['attributes'] = attributes

        if not username:
            return None

        if CAS_SEAFILE_DOMAIN:
            username = username.split('@')[0] + '@' + CAS_SEAFILE_DOMAIN

        username = self.clean_username(username)

        if attributes:
            reject = self.bad_attributes_reject(request, username, attributes)
            if reject:
                return None

            # If we can, we rename the attributes as described in the settings file
            # Existing attributes will be overwritten
            for cas_attr_name, req_attr_name in list(settings.CAS_RENAME_ATTRIBUTES.items()):
                if cas_attr_name in attributes:
                    attributes[req_attr_name] = attributes[cas_attr_name]
                    attributes.pop(cas_attr_name)

        cas_user = SocialAuthUser.objects.get_by_provider_and_uid('cas', username)
        if cas_user:
            try:
                user = User.objects.get(email=cas_user.username)
            except User.DoesNotExist:
                user = None
            if not user:
                # Means found user in social_auth_usersocialauth but not found user in EmailUser,
                # delete it and recreate one.
                logger.warning('The DB data is invalid, delete it and recreate one.')
                SocialAuthUser.objects.filter(provider='cas', uid=username).delete()
        else:
            # compatible with old users via cas ticket
            try:
                user = User.objects.get_old_user(username, 'cas', username)
            except User.DoesNotExist:
                user = None

        created = False
        if not user and settings.CAS_CREATE_USER:
            try:
                user = User.objects.create_cas_user(is_active=True)
                SocialAuthUser.objects.add(user.email, 'cas', username)
            except Exception as e:
                logger.error('create cas user failed: %s' % e)
                return None
            user = self.configure_user(user)
            created = True

        if not self.user_can_authenticate(user):
            return None

        if pgtiou and settings.CAS_PROXY_CALLBACK and request:
            request.session['pgtiou'] = pgtiou

        # if settings.CAS_APPLY_ATTRIBUTES_TO_USER and attributes:
        #     # If we are receiving None for any values which cannot be NULL
        #     # in the User model, set them to an empty string instead.
        #     # Possibly it would be desirable to let these throw an error
        #     # and push the responsibility to the CAS provider or remove
        #     # them from the dictionary entirely instead. Handling these
        #     # is a little ambiguous.
        #     user_model_fields = UserModel._meta.fields
        #     for field in user_model_fields:
        #         # Handle null -> '' conversions mentioned above
        #         if not field.null:
        #             try:
        #                 if attributes[field.name] is None:
        #                     attributes[field.name] = ''
        #             except KeyError:
        #                 continue
        #         # Coerce boolean strings into true booleans
        #         if field.get_internal_type() == 'BooleanField':
        #             try:
        #                 boolean_value = attributes[field.name] == 'True'
        #                 attributes[field.name] = boolean_value
        #             except KeyError:
        #                 continue

        #     user.__dict__.update(attributes)

        #     # If we are keeping a local copy of the user model we
        #     # should save these attributes which have a corresponding
        #     # instance in the DB.
        #     if settings.CAS_CREATE_USER:
        #         user.save()

        # send the `cas_user_authenticated` signal
        cas_user_authenticated.send(
            sender=self,
            user=user,
            created=created,
            attributes=attributes,
            ticket=ticket,
            service=service,
            request=request
        )
        return user

    # ModelBackend has a `user_can_authenticate` method starting from Django
    # 1.10, that only allows active user to log in. For consistency,
    # django-cas-ng will have the same behavior as Django's ModelBackend.
    if not hasattr(ModelBackend, 'user_can_authenticate'):
        def user_can_authenticate(self, user):
            return True

    def get_user_id(self, attributes):
        """
        For use when CAS_CREATE_USER_WITH_ID is True. Will raise ImproperlyConfigured
        exceptions when a user_id cannot be accessed. This is important because we
        shouldn't create Users with automatically assigned ids if we are trying to
        keep User primary key's in sync.
        """
        if not attributes:
            raise ImproperlyConfigured("CAS_CREATE_USER_WITH_ID is True, but "
                                       "no attributes were provided")

        user_id = attributes.get('id')

        if not user_id:
            raise ImproperlyConfigured("CAS_CREATE_USER_WITH_ID is True, but "
                                       "`'id'` is not part of attributes.")

        return user_id

    def clean_username(self, username):
        """
        Performs any cleaning on the "username" prior to using it to get or
        create the user object.  Returns the cleaned username.

        By default, changes the username case according to
        `settings.CAS_FORCE_CHANGE_USERNAME_CASE`.
        """
        username_case = settings.CAS_FORCE_CHANGE_USERNAME_CASE
        if username_case == 'lower':
            username = username.lower()
        elif username_case == 'upper':
            username = username.upper()
        elif username_case is not None:
            raise ImproperlyConfigured(
                "Invalid value for the CAS_FORCE_CHANGE_USERNAME_CASE setting. "
                "Valid values are `'lower'`, `'upper'`, and `None`.")
        return username

    def configure_user(self, user):
        """
        Configures a user after creation and returns the updated user.

        By default, returns the user unmodified.
        """
        return user

    def bad_attributes_reject(self, request, username, attributes):
        return False
