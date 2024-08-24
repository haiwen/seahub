# Copyright (c) 2012-2016 Seafile Ltd.
import os
import logging

from django.urls import reverse
from django.http import HttpResponseRedirect, Http404
from django.shortcuts import render

from django.utils.translation import gettext as _

from seaserv import seafile_api, ccnet_api

from seahub.auth.decorators import login_required
from seahub.contacts.models import Contact
from seahub.profile.models import Profile
from seahub.utils import is_org_context
from seahub.utils.repo import is_valid_repo_id_format
from seahub.views import check_folder_permission
from seahub.settings import THUMBNAIL_SIZE_FOR_GRID
from seahub.search.utils import search_files, get_search_repos_map, \
        SEARCH_FILEEXT, is_valid_date_type, is_valid_size_type

logger = logging.getLogger(__name__)

@login_required
def search(request):

    custom_search = False
    invalid_argument = False
    need_return_custom_search = False
    invalid_info = {
        'error': True,
        'error_msg': _('Invalid argument.'),
    }

    # argument check
    username = request.user.username
    org_id = request.user.org.org_id if is_org_context(request) else None
    keyword = request.GET.get('q', None)

    try:
        current_page = int(request.GET.get('page', '1'))
        per_page = int(request.GET.get('per_page', '25'))
    except ValueError:
        current_page = 1
        per_page = 25

    start = (current_page - 1) * per_page
    size = per_page
    if start < 0 or size < 0:
        invalid_argument = True

    search_repo = request.GET.get('search_repo', 'all') # val: 'all' or 'repo_id'
    search_repo = search_repo.lower()
    if not is_valid_repo_id_format(search_repo) and search_repo != 'all':
        invalid_argument = True

    search_path = request.GET.get('search_path', None)
    if search_path is not None and search_path[0] != '/':
        search_path = "/{0}".format(search_path)

    search_ftypes = request.GET.get('search_ftypes', 'all') # val: 'all' or 'custom'
    search_ftypes = search_ftypes.lower()
    if search_ftypes not in ('all', 'custom'):
        invalid_argument = True

    time_from = request.GET.get('time_from', '')
    time_to = request.GET.get('time_to', '')
    size_from = request.GET.get('size_from', '')
    size_to = request.GET.get('size_to', '')

    date_from = request.GET.get('date_from', '')
    date_to = request.GET.get('date_to', '')
    size_from_mb = request.GET.get('size_from_mb', '')
    size_to_mb = request.GET.get('size_to_mb', '')

    if time_from:
        if not is_valid_date_type(time_from) and not invalid_argument:
            need_return_custom_search = True
            invalid_argument = True
            invalid_info['error_msg'] = _('Invalid date.')
    else:
        time_from = None

    if time_to:
        if not is_valid_date_type(time_to) and not invalid_argument:
            need_return_custom_search = True
            invalid_argument = True
            invalid_info['error_msg'] = _('Invalid date.')
    else:
        time_to = None

    if size_from:
        if not is_valid_size_type(size_from) and not invalid_argument:
            need_return_custom_search = True
            invalid_argument = True
            invalid_info['error_msg'] = _('Invalid file size.')
    else:
        size_from = None

    if size_to:
        if not is_valid_size_type(size_to) and not invalid_argument:
            need_return_custom_search = True
            invalid_argument = True
            invalid_info['error_msg'] = _('Invalid file size.')
    else:
        size_to = None

    if size_to and size_from and size_to < size_from and not invalid_argument:
        invalid_argument = True
        need_return_custom_search = True
        invalid_info['error_msg'] = _('Invalid file size range.')

    if time_to and time_from and time_to < time_from and not invalid_argument:
        invalid_argument = True
        need_return_custom_search = True
        invalid_info['error_msg'] = _('Invalid date range.')

    time_range = (time_from, time_to)
    size_range = (size_from, size_to)
    suffixes = None
    custom_ftypes =  request.GET.getlist('ftype') # types like 'Image', 'Video'... same in utils/file_types.py
    input_fileexts = request.GET.get('input_fexts', '') # file extension input by the user
    if search_ftypes == 'custom':
        suffixes = []
        if len(custom_ftypes) > 0:
            for ftp in custom_ftypes:
                if ftp in SEARCH_FILEEXT:
                    for ext in SEARCH_FILEEXT[ftp]:
                        suffixes.append(ext)

        if input_fileexts:
            input_fexts = input_fileexts.split(',')
            for i_ext in input_fexts:
                i_ext = i_ext.strip()
                if i_ext:
                    suffixes.append(i_ext)

    range_args = [time_from, time_to, size_from, size_to]
    if search_repo != 'all' or search_ftypes == 'custom' or any(e for e in range_args):
        custom_search = True

    if invalid_argument:
        if need_return_custom_search:
            invalid_info['keyword'] = keyword
            invalid_info['search_repo'] = search_repo
            invalid_info['search_ftypes'] = search_ftypes
            invalid_info['custom_ftypes'] = custom_ftypes
            invalid_info['input_fileexts'] = input_fileexts
            invalid_info['custom_search'] = custom_search
            invalid_info['date_from'] = date_from
            invalid_info['date_to'] = date_to
            invalid_info['size_from_mb'] = size_from_mb
            invalid_info['size_to_mb'] = size_to_mb
        return render(request, 'search_results.html', invalid_info)

    repo_id_map = {}
    # check recourse and permissin when search in a single repo
    if is_valid_repo_id_format(search_repo):
        repo_id = search_repo
        repo = seafile_api.get_repo(repo_id)
        # recourse check
        if not repo:
            data = {
                'error': True,
                'error_msg': _('Library %s not found.') % repo_id
            }
            return render(request, 'search_results.html', data)

        # permission check
        if not check_folder_permission(request, repo_id, '/'):
            data = {
                'error': True,
                'error_msg': _('Permission denied.')
            }
            return render(request, 'search_results.html', data)
        map_id = repo.origin_repo_id if repo.origin_repo_id else repo_id
        repo_id_map[map_id] = repo
    else:
        shared_from = request.GET.get('shared_from', None)
        not_shared_from = request.GET.get('not_shared_from', None)
        repo_id_map, repo_type_map = get_search_repos_map(search_repo,
                username, org_id, shared_from, not_shared_from)

    obj_desc = {
        'suffixes': suffixes,
        'time_range': time_range,
        'size_range': size_range
    }
    # search file
    try:
        if keyword:
            results, total = search_files(repo_id_map, search_path, keyword, obj_desc, start, size, org_id)
        else:
            results, total, keyword = [], 0, ''
    except Exception as e:
        logger.error(e)
        data = {
            'error': True,
            'error_msg': _('Internal Server Error')
        }
        return render(request, 'search_results.html', data)

    has_more = True if total > current_page * per_page else False
    for r in results:
        r['parent_dir'] = os.path.dirname(r['fullpath'].rstrip('/'))

    response_dict = {
            'repo': repo if is_valid_repo_id_format(search_repo) else None,
            'keyword': keyword,
            'results': results,
            'total': total,
            'has_more': has_more,
            'current_page': current_page,
            'prev_page': current_page - 1,
            'next_page': current_page + 1,
            'per_page': per_page,
            'search_repo': search_repo,
            'search_ftypes': search_ftypes,
            'custom_ftypes': custom_ftypes,
            'input_fileexts': input_fileexts,
            'error': False,
            'thumbnail_size': THUMBNAIL_SIZE_FOR_GRID,
            'date_from': date_from,
            'date_to': date_to,
            'size_from_mb': size_from_mb,
            'size_to_mb': size_to_mb,
            'custom_search': custom_search
            }

    # Whether use new index page
    use_new_page = True
    if request.GET.get('_old', None):
        use_new_page = False

    if use_new_page:
        return render(request, 'search_results_react.html', response_dict)

    return render(request, 'search_results.html', response_dict)

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
