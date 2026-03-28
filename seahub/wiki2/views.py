# Copyright (c) 2012-2016 Seafile Ltd.
import os
import json
import logging
import posixpath
from datetime import datetime

from constance import config
from seaserv import seafile_api

from django.http import Http404, HttpResponseRedirect
from django.shortcuts import render
from django.urls import reverse

from seahub.wiki2.models import Wiki2 as Wiki
from seahub.wiki2.models import Wiki2Publish, WikiFileViews, Wiki2Settings
from seahub.utils import get_file_type_and_ext, render_permission_error
from seahub.utils.file_types import SEADOC
from seahub.auth.decorators import login_required
from seahub.wiki2.utils import check_wiki_permission, get_wiki_config
from seahub.views import get_seadoc_file_uuid
from seahub.utils import gen_file_get_url
from seahub.utils.repo import get_repo_owner, is_repo_admin, list_user_admin_reops
from seahub.settings import SEADOC_SERVER_URL
from seahub.seadoc.utils import gen_seadoc_access_token
from seahub.api2.endpoints.utils import sdoc_export_to_html

# Get an instance of a logger
logger = logging.getLogger(__name__)


@login_required
def wiki_view(request, wiki_id, page_id=None):
    """ edit wiki page. for wiki2
    """
    # get wiki object or 404
    wiki = Wiki.objects.get(wiki_id=wiki_id)
    if not wiki:
        raise Http404

    username = request.user.username
    repo_owner = get_repo_owner(request, wiki_id)
    wiki.owner = repo_owner

    file_path = ''

    if page_id:
        wiki_config = get_wiki_config(wiki.repo_id, username)
        pages = wiki_config.get('pages', [])
        page_info = next(filter(lambda t: t['id'] == page_id, pages), {})
        file_path = page_info.get('path', '')

    is_page = False
    if file_path:
        is_page = True

    # perm check
    permission = check_wiki_permission(wiki, username)
    if not check_wiki_permission(wiki, username):
        return render_permission_error(request, 'Permission denied.')

    latest_contributor = ''
    last_modified = 0
    file_type, ext = get_file_type_and_ext(posixpath.basename(file_path))
    repo_id = wiki.repo_id
    repo = seafile_api.get_repo(repo_id)
    if is_page and file_type == SEADOC:
        try:
            dirent = seafile_api.get_dirent_by_path(repo_id, file_path)
            if dirent:
                latest_contributor, last_modified = dirent.modifier, dirent.mtime
        except Exception as e:
            logger.warning(e)


    is_admin = is_repo_admin(username, repo_id)
    last_modified = datetime.fromtimestamp(last_modified)
    try:
        publish_config = Wiki2Publish.objects.get(repo_id=wiki.repo_id)
        publish_url = publish_config.publish_url
    except Wiki2Publish.DoesNotExist:
        publish_url = ''
    
    try:
        admin_repos = list_user_admin_reops(request)
    except Exception as e:
        logger.error(e)
        admin_repos = []
    
    display_repos = []
    for r in admin_repos:
        if r.get('encrypted'):
            continue
        display_repos.append(r)
    
    settings_obj = Wiki2Settings.objects.filter(wiki_id=wiki_id).first()
    if settings_obj:
        linked_repos = settings_obj.get_linked_repos()
        settings = {
            "enable_link_repos": bool(settings_obj.enable_link_repos),
            "linked_repos": linked_repos
        }
    else:
        wiki_settings = Wiki2Settings.objects.create(wiki_id=wiki_id, enable_link_repos=True)
        settings = {
            "enable_link_repos": bool(wiki_settings.enable_link_repos),
            "linked_repos": []
        }

    repos_json = json.dumps(display_repos)
    settings_json = json.dumps(settings)
    return render(request, "wiki/wiki_edit.html", {
        "wiki": wiki,
        "is_admin": is_admin,
        "file_path": file_path,
        "repo_name": repo.name if repo else '',
        "modifier": latest_contributor,
        "modify_time": last_modified,
        "seadoc_server_url": SEADOC_SERVER_URL,
        "permission": permission,
        "enable_user_clean_trash": config.ENABLE_USER_CLEAN_TRASH,
        "publish_url": publish_url,
        "repos": repos_json,
        "settings": settings_json
    })


def wiki_publish_view(request, publish_url, page_id=None):
    """ view wiki page. for wiki2
    1 permission
       All user
    """
    # get wiki_publish object or 404
    wiki_publish = Wiki2Publish.objects.filter(publish_url=publish_url).first()
    if not wiki_publish:
        raise Http404

    wiki_id = wiki_publish.repo_id
    wiki = Wiki.objects.get(wiki_id=wiki_id)
    if not wiki:
        raise Http404

    repo_owner = get_repo_owner(request, wiki_id)
    wiki.owner = repo_owner

    file_path = ''

    if page_id:
        wiki_config = get_wiki_config(wiki.repo_id, '')
        pages = wiki_config.get('pages', [])
        page_info = next(filter(lambda t: t['id'] == page_id, pages), {})
        file_path = page_info.get('path', '')

    is_page = False
    if file_path:
        is_page = True

    latest_contributor = ''
    last_modified = 0
    file_type, ext = get_file_type_and_ext(posixpath.basename(file_path))
    repo = seafile_api.get_repo(wiki.repo_id)
    if is_page and file_type == SEADOC:
        try:
            dirent = seafile_api.get_dirent_by_path(wiki.repo_id, file_path)
            if dirent:
                latest_contributor, last_modified = dirent.modifier, dirent.mtime
        except Exception as e:
            logger.warning(e)

    last_modified = datetime.fromtimestamp(last_modified)
    # update visit_count
    try:
        current_count = wiki_publish.visit_count
        wiki_publish.visit_count = current_count + 1
        wiki_publish.save()
    except Exception as e:
        logger.warning(e)

    template_name = 'wiki/wiki_publish.html'
    render_context = {
        "wiki": wiki,
        "file_path": file_path,
        "repo_name": repo.name if repo else '',
        "modifier": latest_contributor,
        "modify_time": last_modified,
        "seadoc_server_url": SEADOC_SERVER_URL,
        "permission": 'public',
        "publish_url": publish_url,
    }

    if not wiki_publish.enable_server_render:
        return render(request, template_name, render_context)

    # ------------------------------------------------------------------
    # SEO: server-side rendering of sdoc → HTML
    # When enable_server_render is True, convert the .sdoc file to HTML
    # in Python before responding, so search-engine crawlers can index
    # the page content without executing JavaScript.
    # ------------------------------------------------------------------

    if not page_id:
        wiki_config = get_wiki_config(wiki.repo_id, '')
        pages = wiki_config.get('pages', [])
        page_id = pages[0]['id']

    page_info = next(filter(lambda t: t['id'] == page_id, pages), {})
    file_path = page_info.get('path', '')

    # get wiki title
    wiki_file_name = os.path.basename(file_path)
    wiki_title = os.path.splitext(wiki_file_name)[0]

    # get wiki navigation
    def add_url_recursive(item):
        item['url'] = f"/wiki/publish/{publish_url}/{item['id']}/"
        item['name'] = id_name_dict[item['id']]
        if 'children' in item:
            for child in item['children']:
                add_url_recursive(child)
        return item

    id_name_dict = {page['id']: page['name'] for page in pages}
    wiki_navigation = wiki_config.get('navigation', [])
    wiki_navigation = [add_url_recursive(item) for item in wiki_navigation]

    # get wiki html
    file_id = seafile_api.get_file_id_by_path(wiki_id, file_path)
    download_token = seafile_api.get_fileserver_access_token(wiki_id,
                                                             file_id,
                                                             'download',
                                                             '',
                                                             use_onetime=False)
    src_type = 'sdoc'
    dst_type = 'html'
    filename = os.path.basename(file_path)
    doc_uuid = get_seadoc_file_uuid(repo, file_path)
    download_url = gen_file_get_url(download_token, filename)
    html_resp = sdoc_export_to_html(file_path, '', doc_uuid,
                                    download_url, src_type, dst_type)
    wiki_html = html_resp.content
    wiki_html = wiki_html.decode('utf-8')

    # render
    template_name = 'wiki/wiki_publish_ssr.html'
    render_context.update({
        "wiki_repo_name": wiki.name,
        "wiki_title": wiki_title,
        "wiki_html": wiki_html,
        "wiki_navigation": wiki_navigation
    })
    return render(request, template_name, render_context)


def wiki_history_view(request, wiki_id):
    """ view wiki history page. for wiki2
    """
    # get wiki object or 404
    wiki = Wiki.objects.get(wiki_id=wiki_id)
    if not wiki:
        raise Http404

    username = request.user.username
    repo_owner = get_repo_owner(request, wiki_id)
    wiki.owner = repo_owner

    page_id = request.GET.get('page_id')

    if page_id:
        wiki_config = get_wiki_config(wiki.repo_id, username)
        pages = wiki_config.get('pages', [])
        page_info = next(filter(lambda t: t['id'] == page_id, pages), {})

    # perm check
    if not check_wiki_permission(wiki, username):
        return render_permission_error(request, 'Permission denied.')

    repo_id = wiki.repo_id
    repo = seafile_api.get_repo(repo_id)
    file_uuid = page_info['docUuid']
    file_name = page_info['name']
    filePath = page_info['path']
    wiki_config = json.dumps(page_info)

    return render(request, "wiki/wiki_file_revisions.html", {
        'repo': repo,
        "wiki_config": wiki_config,
        "file_uuid": file_uuid,
        "file_name": file_name,
        "filePath": filePath,
        'assets_url': '/api/v2.1/seadoc/download-image/' + file_uuid,
        "seadoc_access_token": gen_seadoc_access_token(file_uuid, file_name, username, permission='rw'),
        "seadoc_server_url": SEADOC_SERVER_URL
    })

def wiki_repo_view(request, wiki_id, view_id):

    # get wikiView object or 404
    wikiFileView = WikiFileViews.objects.get_view(wiki_id, view_id)
    if not wikiFileView:
        raise Http404

    repo_id = wikiFileView['linked_repo_id']
    repo = seafile_api.get_repo(repo_id)

    return render(request, "wiki_repo_view.html", {
        'repo': repo,
        'wiki_id': wiki_id,
        'view_id': view_id,
        'repo_id': repo_id,
    })


@login_required
def wiki_search_result_view(request, wiki_id, doc_uuid):
    """Redirect /wikis/<wiki_id>/<doc_uuid>/ to /wikis/<wiki_id>/<page_id>/
    by looking up doc_uuid in wiki config.
    """
    wiki = Wiki.objects.get(wiki_id=wiki_id)
    if not wiki:
        raise Http404

    username = request.user.username

    # perm check
    if not check_wiki_permission(wiki, username):
        return render_permission_error(request, 'Permission denied.')

    wiki_config = get_wiki_config(wiki.repo_id, username)
    pages = wiki_config.get('pages', [])

    page_id = None
    for page in pages:
        if page.get('docUuid') == doc_uuid:
            page_id = page.get('id')
            break
    if not page_id:
        raise Http404

    redirect_url = reverse('wiki', args=[wiki_id, page_id])
    return HttpResponseRedirect(redirect_url)
