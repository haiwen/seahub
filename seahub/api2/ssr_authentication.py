# seahub/api2/ssr_authentication.py
#
# A lightweight Django REST Framework authentication class that accepts
# requests from the wiki-ssr Next.js service via a shared secret header.
#
# Usage in an APIView:
#   authentication_classes = (SsrInternalAuthentication, TokenAuthentication, SessionAuthentication)
#
# The class creates a synthetic AnonymousUser-like object so that DRF's
# permission layer doesn't need to be special-cased — the views that use
# this auth class simply allow AllowAny (the secret itself is the gate).

import logging
from django.contrib.auth.models import AnonymousUser
from rest_framework import authentication, exceptions

logger = logging.getLogger(__name__)

_SENTINEL = object()


class _SsrUser(AnonymousUser):
    """Synthetic user representing the wiki-ssr internal service."""
    username = '__wiki_ssr_service__'
    is_authenticated = True   # satisfy DRF IsAuthenticated if ever needed

    def __str__(self):
        return self.username


class SsrInternalAuthentication(authentication.BaseAuthentication):
    """
    Authenticate requests that carry the X-Wiki-SSR-Secret header.

    The expected secret is read lazily from Django settings so that it
    can be overridden in local_settings.py without restarting this module.
    """

    HEADER = 'HTTP_X_WIKI_SSR_SECRET'   # Django META key for X-Wiki-SSR-Secret

    def _get_expected_secret(self):
        # Import here to avoid circular imports and to pick up
        # runtime overrides from local_settings.py.
        try:
            from seahub.settings import WIKI_SSR_INTERNAL_SECRET
            return WIKI_SSR_INTERNAL_SECRET
        except ImportError:
            return ''

    def authenticate(self, request):
        secret = request.META.get(self.HEADER, '')
        if not secret:
            # No header — let the next authenticator try
            return None

        expected = self._get_expected_secret()
        if not expected:
            logger.debug('[SsrInternalAuthentication] WIKI_SSR_INTERNAL_SECRET not configured; rejecting.')
            raise exceptions.AuthenticationFailed('SSR authentication is not configured.')

        # Constant-time comparison to resist timing attacks
        import hmac
        if not hmac.compare_digest(secret, expected):
            raise exceptions.AuthenticationFailed('Invalid SSR internal secret.')

        return (_SsrUser(), None)

    def authenticate_header(self, request):
        return 'X-Wiki-SSR-Secret'
