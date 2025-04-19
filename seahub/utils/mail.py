# Copyright (c) 2012-2016 Seafile Ltd.
import os
import logging
from email.mime.application import MIMEApplication
from cryptography.hazmat.primitives import serialization, hashes
from cryptography.hazmat.primitives.serialization import pkcs7
from cryptography import x509
import base64
from django.template import loader
from django.core.mail import EmailMessage

from seahub.utils import get_site_scheme_and_netloc, get_site_name
from seahub.settings import MEDIA_URL, LOGO_PATH, \
        MEDIA_ROOT, CUSTOM_LOGO_PATH, ENABLE_SMIME

from seahub import settings

logger = logging.getLogger(__name__)


def add_smime_sign(msg):
    if not ENABLE_SMIME:
        return None
    
    CERTS_DIR = getattr(settings, 'SMIME_CERTS_DIR', '/opt/seafile/seahub-data/certs')
    cert_file = os.path.join(CERTS_DIR, 'cert.pem')
    key_file = os.path.join(CERTS_DIR, 'private_key.pem')
    if not os.path.exists(cert_file):
        logger.warning('smime cert file %s does not exists.' % cert_file)
        return None
    
    if not os.path.exists(key_file):
        logger.warning('smime key file %s does not exists.' % key_file)
        return None
    
    # Load the private key
    with open(key_file, "rb") as f:
        private_key = serialization.load_pem_private_key(f.read(), password=None)
    
    # Load the certificate
    with open(cert_file, "rb") as f:
        certificate = x509.load_pem_x509_certificate(f.read())
    
    msg_payload = msg.message().as_string().encode()
    
    builder = pkcs7.PKCS7SignatureBuilder() \
        .set_data(msg_payload) \
        .add_signer(certificate, private_key, hashes.SHA256())
    pkcs7_signature = builder.sign(serialization.Encoding.SMIME, [pkcs7.PKCS7Options.DetachedSignature])
    
    # Base64 encode the signature for S/MIME
    signature_b64 = base64.b64encode(pkcs7_signature).decode()
    
    # Create the S/MIME signature part
    sig_part = MIMEApplication(
        signature_b64,
        "pkcs7-signature",
    )
    sig_part.set_param("name", "smime.p7s")
    sig_part.add_header("Content-Disposition", "attachment", filename="smime.p7s")
    
    return sig_part



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
        sig_part = add_smime_sign(mail)
        if sig_part:
            mail.attach(sig_part)
        mail.send()
        return True
    except Exception as e:
        logger.error(e)
        return False
