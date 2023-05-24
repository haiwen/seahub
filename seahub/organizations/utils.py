# Copyright (c) 2012-2016 Seafile Ltd.
import os
import configparser

from django.db import connection
from django.core.cache import cache
from django.urls import reverse

from seahub.utils import gen_token, get_service_url


def get_ccnet_db_name():
    ccnet_conf_dir = os.environ.get('SEAFILE_CENTRAL_CONF_DIR') or os.environ.get('CCNET_CONF_DIR')
    if not ccnet_conf_dir:
        error_msg = 'Environment variable ccnet_conf_dir is not define.'
        return None, error_msg

    ccnet_conf_path = os.path.join(ccnet_conf_dir, 'ccnet.conf')
    config = configparser.ConfigParser()
    config.read(ccnet_conf_path)

    if config.has_section('Database'):
        db_name = config.get('Database', 'DB', fallback='ccnet')
    else:
        db_name = 'ccnet'

    return db_name, None


def update_org_url_prefix(db_name, org_id, url_prefix):
    sql = """UPDATE `%s`.Organization SET url_prefix=%%s WHERE org_id=%%s""" % db_name
    with connection.cursor() as cursor:
        cursor.execute(sql, (url_prefix, org_id))


def get_or_create_invitation_link(org_id):
    """Invitation link for an org. Users will be redirected to WeChat QR page.
    Mainly used in docs.seafile.com.
    """
    org_id = int(org_id)
    expires = 3 * 24 * 60 * 60

    def get_token_by_org_id(org_id):
        return cache.get('org_associate_%d' % org_id, None)

    def set_token_by_org_id(org_id, token):
        cache.set('org_associate_%d' % org_id, token, expires)

    def get_org_id_by_token(token):
        return cache.get('org_associate_%s' % token, -1)

    def set_org_id_by_token(token, org_id):
        cache.set('org_associate_%s' % token, org_id, expires)

    token = get_token_by_org_id(org_id)
    cached_org_id = get_org_id_by_token(token)

    if token and org_id == cached_org_id:
        return '%s/weixin/oauth-login/?next=%s' % (
            get_service_url().rstrip('/'), reverse('org_associate', args=[token]))

    token = gen_token(32)
    set_token_by_org_id(org_id, token)
    set_org_id_by_token(token, org_id)

    link = '%s/weixin/oauth-login/?next=%s' % (
        get_service_url().rstrip('/'), reverse('org_associate', args=[token]))
    return link
