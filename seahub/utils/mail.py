from django.template import Context, loader
from post_office import mail

from seahub.utils import get_site_scheme_and_netloc
from seahub.settings import SITE_NAME, MEDIA_URL, LOGO_PATH

def send_html_email_with_dj_template(recipients, subject, dj_template,
                                     context={}, sender=None, template=None,
                                     message='', headers=None,
                                     priority=None, backend=''):
    """

    Arguments:
    - `recipients`:
    - `sender`:
    - `template`:
    - `context`:
    - `subject`:

    """
    base_context = {
        'url_base': get_site_scheme_and_netloc(),
        'site_name': SITE_NAME,
        'media_url': MEDIA_URL,
        'logo_path': LOGO_PATH,
    }
    context.update(base_context)
    t = loader.get_template(dj_template)
    html_message = t.render(Context(context))

    mail.send(recipients, sender=sender, template=template, context=context,
              subject=subject, message=message,
              html_message=html_message, headers=headers, priority=priority,
              backend=backend)
