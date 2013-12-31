from rest_framework.authentication import BaseAuthentication

from models import Token
from seahub.base.accounts import User

class TokenAuthentication(BaseAuthentication):
    """
    Simple token based authentication.

    Clients should authenticate by passing the token key in the "Authorization"
    HTTP header, prepended with the string "Token ".  For example:

        Authorization: Token 401f7ac837da42b97f613d789819ff93537bee6a
    """

    model = Token
    """
    A custom token model may be used, but must have the following properties.

    * key -- The string identifying the token
    * user -- The user to which the token belongs
    """

    def authenticate(self, request):
        auth = request.META.get('HTTP_AUTHORIZATION', '').split()

        if len(auth) == 2 and auth[0].lower() == "token":
            key = auth[1]
            try:
                token = self.model.objects.get(key=key)
            except self.model.DoesNotExist:
                return None
            try:
                user = User.objects.get(email=token.user)
            except User.DoesNotExist:
                return None
            if user.is_active:
                return (user, token)

