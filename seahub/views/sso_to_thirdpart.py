# -*- coding: utf-8 -*-
import time
import logging

import jwt
from django.http import HttpResponseRedirect

from seahub.auth.decorators import login_required
from seahub.utils import render_error
try:
    from seahub.settings import ENABLE_SSO_TO_THIRDPART_WEBSITE, THIRDPART_WEBSITE_SECRET_KEY, THIRDPART_WEBSITE_URL
except ImportError:
    ENABLE_SSO_TO_THIRDPART_WEBSITE = False
    THIRDPART_WEBSITE_SECRET_KEY = ''
    THIRDPART_WEBSITE_URL = ''

logger = logging.getLogger(__name__)


@login_required
def sso_to_thirdpart(request):
    if not ENABLE_SSO_TO_THIRDPART_WEBSITE or not THIRDPART_WEBSITE_SECRET_KEY or not THIRDPART_WEBSITE_URL:
        return render_error(request, 'Feature is not enabled.')

    username = request.user.username
    payload = {'exp': int(time.time()) + 30, 'user_id': username}
    try:
        access_token = jwt.encode(payload, THIRDPART_WEBSITE_SECRET_KEY, algorithm='HS512')
    except Exception as e:
        logger.error(e)
        return render_error(request, 'Internal Server Error')

    redirect_to = THIRDPART_WEBSITE_URL.strip('/') + '/?token=%s' % access_token
    return HttpResponseRedirect(redirect_to)
