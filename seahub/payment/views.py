import jwt
import time
import uuid
from urllib.parse import urlparse

from django.http import HttpResponse

from seahub.utils import render_error, get_service_url
from seahub.profile.models import Profile
from seahub.auth.decorators import login_required
from seahub.organizations.decorators import org_staff_required

from seahub.payment.settings import ENABLE_PAYMENT, \
        PAYMENT_SERVICE_URL, PAYMENT_JWT_AUTH_URL, \
        PAYMENT_JWT_SECRET_KEY, PAYMENT_JWT_ALGORITHM, PAYMENT_JWT_EXPIRATION


@login_required
@org_staff_required
def payment(request):

    if not ENABLE_PAYMENT:
        return render_error(request, 'Payment is not enabled.')

    org = request.user.org
    org_id = org.org_id

    ccnet_email = request.user.username
    profile = Profile.objects.get_profile_by_user(ccnet_email)
    contact_email = profile.contact_email if profile and profile.contact_email else ''
    nickname = profile.nickname if profile and profile.nickname else ''

    seafile_service_url = get_service_url()
    seafile_parsed_url = urlparse(seafile_service_url)
    seafile_domain = seafile_parsed_url.netloc.split(':')[0]

    payment_parsed_url = urlparse(PAYMENT_SERVICE_URL)
    payment_domain = payment_parsed_url.netloc.split(':')[0]

    now = int(time.time())
    exp = now + PAYMENT_JWT_EXPIRATION

    payload = {
        "iss": seafile_domain,
        "aud": payment_domain,
        "exp": exp,
        "jti": str(uuid.uuid4()),
        "email": contact_email or ccnet_email,
        "name": nickname,
        "org_id": org_id
    }

    token = jwt.encode(payload, PAYMENT_JWT_SECRET_KEY,
                       algorithm=PAYMENT_JWT_ALGORITHM)

    payment_jwt_url = f'{PAYMENT_SERVICE_URL}{PAYMENT_JWT_AUTH_URL}'
    html = f'''
    <html>
        <body>
            <form id="postForm" action="{payment_jwt_url}" method="post">
                <input type="hidden" name="token" value="{token}">
            </form>
            <script>
                document.getElementById('postForm').submit();
            </script>
        </body>
    </html>
    '''
    response = HttpResponse(html)
    response['Content-Type'] = 'text/html'
    return response
