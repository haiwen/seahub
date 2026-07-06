import logging
from django.conf import settings

logger = logging.getLogger(__name__)

def check_turnstile(request):
    """
    Verify Cloudflare Turnstile token.
    Returns:
        (bool) True if verification is successful or turnstile is disabled, False otherwise.
    """
    enable_turnstile = getattr(settings, 'ENABLE_TURNSTILE', False)
    if not enable_turnstile:
        return True

    turnstile_token = request.data.get('cf_turnstile_response') if hasattr(request, 'data') else request.POST.get('cf-turnstile-response', '')
    if not turnstile_token:
        logger.warning('Cloudflare Turnstile check failed: Missing token')
        return False

    secret = getattr(settings, 'TURNSTILE_SECRET_KEY', '')
    if not secret:
        logger.warning('Cloudflare Turnstile check failed: TURNSTILE_SECRET_KEY is not configured')
        return False

    try:
        from seahub.api2.utils import get_client_ip
        remoteip = get_client_ip(request)
    except Exception:
        remoteip = None

    try:
        import requests
        url = getattr(settings, 'TURNSTILE_SITEVERIFY_URL', 'https://challenges.cloudflare.com/turnstile/v0/siteverify')
        data = {'secret': secret, 'response': turnstile_token}
        if remoteip:
            data['remoteip'] = remoteip
        response = requests.post(url, data=data, timeout=10)
        result = response.json()
        if not result.get('success'):
            logger.warning(f"Turnstile verification failed: {result}")
            return False
        return True
    except Exception as e:
        logger.warning(f"Turnstile verification error: {e}")
        return False
