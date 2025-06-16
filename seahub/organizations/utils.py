# Copyright (c) 2012-2016 Seafile Ltd.
from django.core.cache import cache
from django.urls import reverse

from seahub.invitations.models import Invitation
from seahub.utils import gen_token, get_service_url


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


def generate_org_reactivate_link(org_id):
    i = Invitation.objects.add(inviter='Administrator',
                               accepter=org_id,
                               invite_type='org')

    service_url = get_service_url().strip('/')
    url = reverse('org_reactivate', args=[i.token])
    url = f'{service_url}{url}'
    return url
