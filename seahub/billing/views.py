import jwt
import time
import uuid
from urllib.parse import urlparse

from django.http import HttpResponse

from seahub.utils import render_error, get_service_url
from seahub.profile.models import Profile
from seahub.auth.decorators import login_required
from seahub.organizations.decorators import org_staff_required

from seahub.billing.settings import ENABLE_EXTERNAL_BILLING_SERVICE, \
        BILLING_SERVICE_URL, BILLING_SERVICE_JWT_AUTH_URL, \
        BILLING_SERVICE_JWT_SECRET_KEY, BILLING_SERVICE_JWT_ALGORITHM, \
        BILLING_SERVICE_JWT_EXPIRATION


@login_required
@org_staff_required
def billing(request):

    if not ENABLE_EXTERNAL_BILLING_SERVICE:
        return render_error(request, 'Billing is not enabled.')

    org = request.user.org
    org_id = org.org_id

    ccnet_email = request.user.username
    profile = Profile.objects.get_profile_by_user(ccnet_email)
    contact_email = profile.contact_email if profile and profile.contact_email else ''
    nickname = profile.nickname if profile and profile.nickname else ''

    seafile_parsed_url = urlparse(get_service_url())
    seafile_domain = seafile_parsed_url.netloc.split(':')[0]

    billing_parsed_url = urlparse(BILLING_SERVICE_URL)
    billing_domain = billing_parsed_url.netloc.split(':')[0]

    now = int(time.time())
    exp = now + BILLING_SERVICE_JWT_EXPIRATION

    payload = {
        "iss": seafile_domain,
        "aud": billing_domain,
        "exp": exp,
        "jti": str(uuid.uuid4()),
        "email": contact_email or ccnet_email,
        "name": nickname,
        "org_id": org_id
    }

    token = jwt.encode(payload, BILLING_SERVICE_JWT_SECRET_KEY,
                       algorithm=BILLING_SERVICE_JWT_ALGORITHM)

    html = f'''
    <html>
        <body>
            <form id="postForm" action="{BILLING_SERVICE_JWT_AUTH_URL}" method="post">
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
