# Copyright (c) 2012-2016 Seafile Ltd.
import os
import logging

from django.urls import reverse
from django.http import HttpResponseRedirect, Http404
from django.shortcuts import render

from django.utils.translation import gettext as _

from seaserv import ccnet_api

from seahub.auth.decorators import login_required
from seahub.contacts.models import Contact
from seahub.profile.models import Profile
from seahub.utils import is_org_context

logger = logging.getLogger(__name__)

@login_required
def pubuser_search(request):
    can_search = False
    if is_org_context(request):
        can_search = True
    elif request.cloud_mode:
        # Users are not allowed to search public user when in cloud mode.
        can_search = False
    else:
        can_search = True

    if can_search is False:
        raise Http404

    email_or_nickname = request.GET.get('search', '')
    if not email_or_nickname:
        return HttpResponseRedirect(reverse('pubuser'))

    # Get user's contacts, used in show "add to contacts" button.
    username = request.user.username
    contacts = Contact.objects.get_contacts_by_user(username)
    contact_emails = [request.user.username]
    for c in contacts:
        contact_emails.append(c.contact_email)

    search_result = []
    # search by username
    if is_org_context(request):
        url_prefix = request.user.org.url_prefix
        org_users = ccnet_api.get_org_users_by_url_prefix(url_prefix, -1, -1)
        users = []
        for u in org_users:
            if email_or_nickname in u.email:
                users.append(u)
    else:
        users = ccnet_api.search_emailusers(email_or_nickname, -1, -1)
    for u in users:
        can_be_contact = True if u.email not in contact_emails else False
        search_result.append({'email': u.email,
                              'can_be_contact': can_be_contact})

    # search by nickname
    if is_org_context(request):
        url_prefix = request.user.org.url_prefix
        org_users = ccnet_api.get_org_users_by_url_prefix(url_prefix, -1, -1)
        profile_all = Profile.objects.filter(user__in=[u.email for u in org_users]).values('user', 'nickname')
    else:
        profile_all = Profile.objects.all().values('user', 'nickname')
    for p in profile_all:
        if email_or_nickname in p['nickname']:
            can_be_contact = True if p['user'] not in contact_emails else False
            search_result.append({'email': p['user'],
                                  'can_be_contact': can_be_contact})

    uniq_usernames = []
    for res in search_result:
        if res['email'] not in uniq_usernames:
            uniq_usernames.append(res['email'])
        else:
            search_result.remove(res)

    return render(request, 'pubuser.html', {
            'search': email_or_nickname,
            'users': search_result,
            })
