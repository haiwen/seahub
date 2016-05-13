from django.conf import settings

INVITATIONS_TOKEN_AGE = getattr(settings, 'INVITATIONS_TOKEN_AGE', 72)  # hours
