# Copyright (c) 2012-2016 Seafile Ltd.
import os
import logging
from django.template import loader
from django.core.mail import EmailMessage

from seahub.utils import get_site_scheme_and_netloc, get_site_name
from seahub.settings import MEDIA_URL, LOGO_PATH, \
        MEDIA_ROOT, CUSTOM_LOGO_PATH

logger = logging.getLogger(__name__)


def send_html_email_with_dj_template(recipients, subject, dj_template, context={}):
    """

    Arguments:
    - `recipients`:
    - `subject`:
    - `dj_template`:
    - `context`:

    """

    # get logo path
    logo_path = LOGO_PATH
    custom_logo_file = os.path.join(MEDIA_ROOT, CUSTOM_LOGO_PATH)
    if os.path.exists(custom_logo_file):
        logo_path = CUSTOM_LOGO_PATH

    base_context = {
        'url_base': get_site_scheme_and_netloc(),
        'site_name': get_site_name(),
        'media_url': MEDIA_URL,
        'logo_path': logo_path,
    }
    context.update(base_context)
    t = loader.get_template(dj_template)
    html_message = t.render(context)

    mail = EmailMessage(subject=subject, body=html_message, to=[recipients])
    mail.content_subtype = "html"

    try:
        mail.send()
        return True
    except Exception as e:
        logger.error(e)
        return False
