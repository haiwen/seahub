# Copyright (c) 2012-2016 Seafile Ltd.
import os
import re
import logging
import urllib.request
import posixpath

import markdown
import lxml.html
from seaserv import seafile_api
from django.urls import reverse
from django.http import HttpResponseRedirect
from django.utils.safestring import mark_safe
from django.shortcuts import render, get_object_or_404, redirect
from django.utils.translation import ugettext as _

from seahub.share.models import FileShare
from seahub.wiki.models import Wiki
from seahub.views import check_folder_permission
from seahub.utils import get_file_type_and_ext, render_permission_error, \
     gen_inner_file_get_url, render_error
from seahub.views.file import send_file_access_msg
from seahub.utils.file_types import *
from seahub.settings import SERVICE_URL

# Get an instance of a logger
logger = logging.getLogger(__name__)


def slug(request, slug, file_path="home.md"):
    """Show wiki page.
    """
    # get wiki object or 404
    wiki = get_object_or_404(Wiki, slug=slug)
    file_path = "/" + file_path

    is_dir = None
    file_id = seafile_api.get_file_id_by_path(wiki.repo_id, file_path)
    if file_id:
        is_dir = False

    dir_id = seafile_api.get_dir_id_by_path(wiki.repo_id, file_path)
    if dir_id:
        is_dir = True

    # compatible with old wiki url
    if is_dir is None:
        if len(file_path.split('.')) == 1:
            new_path = file_path[1:] + '.md'
            return HttpResponseRedirect(reverse('wiki:slug', args=[slug, new_path]))

    # perm check
    req_user = request.user.username

    if not req_user and not wiki.has_read_perm(request):
        return redirect('auth_login')
    else:
        if not wiki.has_read_perm(request):
            return render_permission_error(request, _('Unable to view Wiki'))

    file_type, ext = get_file_type_and_ext(posixpath.basename(file_path))
    if file_type == IMAGE:
        file_url = reverse('view_lib_file', args=[wiki.repo_id, file_path])
        return HttpResponseRedirect(file_url + "?raw=1")

    if not req_user:
        user_can_write = False
    elif req_user == wiki.username or check_folder_permission(
            request, wiki.repo_id, '/') == 'rw':
        user_can_write = True
    else:
        user_can_write = False

    is_public_wiki = False
    if wiki.permission == 'public':
        is_public_wiki = True

    has_index = False
    dirs = seafile_api.list_dir_by_path(wiki.repo_id, '/')
    for dir_obj in dirs:
        if dir_obj.obj_name == 'index.md':
            has_index = True
            break

    try:
        fs = FileShare.objects.get(repo_id=wiki.repo_id, path='/')
    except FileShare.DoesNotExist:
        fs = FileShare.objects.create_dir_link(wiki.username, wiki.repo_id, '/',
                                               permission='view_download')
        wiki.permission = 'public'
        wiki.save()
        is_public_wiki = True

    repo = seafile_api.get_repo(wiki.repo_id)

    file_content, latest_contributor, last_modified = '', '', 0
    if is_dir is False:
        send_file_access_msg(request, repo, file_path, 'web')

        file_name = os.path.basename(file_path)
        token = seafile_api.get_fileserver_access_token(
            repo.repo_id, file_id, 'download', request.user.username, 'False')
        if not token:
            return render_error(request, _('Internal Server Error'))

        url = gen_inner_file_get_url(token, file_name)
        try:
            file_response = urllib.request.urlopen(url).read().decode()
        except Exception as e:
            logger.error(e)
            return render_error(request, _('Internal Server Error'))

        # Convert a markdown string to HTML
        try:
            html_content = markdown.markdown(file_response)
        except Exception as e:
            logger.error(e)
            return render_error(request, _('Internal Server Error'))

        # Parse the html and replace image url to wiki mode
        html_doc = lxml.html.fromstring(html_content)
        img_elements = html_doc.xpath('//img')   # Get the <img> elements
        img_url_re = re.compile(r'^%s/lib/%s/file.*raw=1$' % (SERVICE_URL, repo.id))
        for img in img_elements:
            img_url = img.attrib.get('src', '')
            if img_url_re.match(img_url) is not None:
                img_path = img_url[img_url.find('/file')+5:img_url.find('?')]
                img_new_url = '%s/view-image-via-public-wiki/?slug=%s&path=%s' % (SERVICE_URL, slug, img_path)
                html_content = html_content.replace(img_url, img_new_url)

        file_content = mark_safe(html_content)

        try:
            dirent = seafile_api.get_dirent_by_path(repo.repo_id, file_path)
            if dirent:
                latest_contributor, last_modified = dirent.modifier, dirent.mtime
            else:
                latest_contributor, last_modified = '', 0
        except Exception as e:
            logger.warning(e)

    return render(request, "wiki/wiki.html", {
        "wiki": wiki,
        "repo_name": repo.name if repo else '',
        "page_name": file_path,
        "shared_token": fs.token,
        "shared_type": fs.s_type,
        "user_can_write": user_can_write,
        "file_path": file_path,
        "filename": os.path.splitext(os.path.basename(file_path))[0],
        "file_content": file_content,
        "latest_contributor": latest_contributor,
        "last_modified": last_modified,
        "repo_id": wiki.repo_id,
        "search_repo_id": wiki.repo_id,
        "search_wiki": True,
        "is_public_wiki": is_public_wiki,
        "is_dir": is_dir,
        "has_index": has_index,
    })


'''
@login_required
def edit_page(request, slug, page_name="home"):

    # get wiki object or 404
    wiki = get_object_or_404(Wiki, slug=slug)

    if request.user.username != wiki.username:
        raise Http404

    filepath = "/" + page_name + ".md"
    url = "%s?p=%s&from=wikis_wiki_page_edit&wiki_slug=%s" % (
            reverse('file_edit', args=[wiki.repo_id]),
            urllib.parse.quote(filepath.encode('utf-8')),
            slug)

    return HttpResponseRedirect(url)
'''
