from django.conf import settings

ENABLE_PAYMENT = getattr(settings, 'ENABLE_PAYMENT', False)

PAYMENT_SERVICE_URL = getattr(settings, 'PAYMENT_SERVICE_URL', '')
PAYMENT_SERVICE_URL = PAYMENT_SERVICE_URL.rstrip('/')

PAYMENT_JWT_AUTH_URL = getattr(settings, 'PAYMENT_JWT_AUTH_URL', '')
PAYMENT_JWT_AUTH_URL = f"/{PAYMENT_JWT_AUTH_URL.strip('/')}/"

PAYMENT_JWT_SECRET_KEY = getattr(settings, 'PAYMENT_JWT_SECRET_KEY', '')
PAYMENT_JWT_ALGORITHM = getattr(settings, 'PAYMENT_JWT_ALGORITHM', 'HS256')
PAYMENT_JWT_EXPIRATION = getattr(settings, 'PAYMENT_JWT_EXPIRATION', 5*60)  # in seconds
