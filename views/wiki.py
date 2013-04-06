# -*- coding: utf-8 -*-
"""
File related views, including view_file, edit_file, view_history_file,
view_trash_file, view_snapshot_file
"""

import os
import simplejson as json
import stat
import tempfile
import urllib
import urllib2
import chardet

from django.contrib.sites.models import Site, RequestSite
from django.core.urlresolvers import reverse
from django.http import HttpResponse, HttpResponseBadRequest, Http404, \
    HttpResponseRedirect
from django.shortcuts import render_to_response, redirect
from django.template import Context, loader, RequestContext
from django.template.loader import render_to_string
from django.utils.hashcompat import md5_constructor
from django.utils.http import urlquote
from django.utils.translation import ugettext as _

from auth.decorators import login_required

import seaserv
from pysearpc import SearpcError


from seahub.wiki.models import PersonalWiki, WikiDoesNotExist, WikiPageMissing
from seahub.wiki import get_personal_wiki_page, get_personal_wiki_repo, \
    convert_wiki_link, get_wiki_pages
from seahub.wiki.forms import WikiCreateForm, WikiNewPageForm
from seahub.utils import get_file_contributors, render_error

@login_required
def personal_wiki(request, page_name="home"):
    username = request.user.username
    wiki_exists = True
    try:
        content, repo, dirent = get_personal_wiki_page(username, page_name)
    except WikiDoesNotExist:
        wiki_exists = False
        return render_to_response("wiki/personal_wiki.html", {
                "wiki_exists": wiki_exists,
                }, context_instance=RequestContext(request))
    except WikiPageMissing:
        repo = get_personal_wiki_repo(username)
        filename = clean_page_name(page_name) + '.md'
        if not post_empty_file(repo.id, "/", filename, username):
            return render_error(request, _("Failed to create wiki page. Please retry later."))
        return HttpResponseRedirect(reverse('personal_wiki', args=[page_name]))
    else:
        url_prefix = reverse('personal_wiki', args=[])
        content = convert_wiki_link(content, url_prefix, repo.id, username)
        
        # fetch file latest contributor and last modified
        path = '/' + dirent.obj_name
        file_path_hash = md5_constructor(urllib2.quote(path.encode('utf-8'))).hexdigest()[:12]            
        contributors, last_modified, last_commit_id = get_file_contributors(\
            repo.id, path.encode('utf-8'), file_path_hash, dirent.obj_id)
        latest_contributor = contributors[0] if contributors else None

        return render_to_response("wiki/personal_wiki.html", {
                "wiki_exists": wiki_exists,
                "content": content,
                "page": os.path.splitext(dirent.obj_name)[0],
                "last_modified": last_modified,
                "latest_contributor": latest_contributor,
                "path": path,
                "repo_id": repo.id,
                }, context_instance=RequestContext(request))

@login_required
def personal_wiki_pages(request):
    """
    List personal wiki pages.
    """
    try:
        repo = get_personal_wiki_repo(request.user.username)
        pages = get_wiki_pages(repo)
    except SearpcError:
        return render_error(request, _('Internal Server Error'))
    except WikiDoesNotExist:
        return render_error(request, _('Wiki does not exists.'))

    return render_to_response("wiki/personal_wiki_pages.html", {
            "pages": pages,
            "repo_id": repo.id
            }, context_instance=RequestContext(request))


@login_required
def personal_wiki_create(request):
    if request.method != 'POST':
        raise Http404

    content_type = 'application/json; charset=utf-8'

    def json_error(err_msg, status=400):
        result = {'error': err_msg}
        return HttpResponse(json.dumps(result), status=status,
                            content_type=content_type)
    
    form = WikiCreateForm(request.POST)
    if not form.is_valid():
        return json_error(str(form.errors.values()[0]))

    # create group repo in user context
    repo_name = form.cleaned_data['repo_name']
    repo_desc = form.cleaned_data['repo_desc']
    username = request.user.username
    passwd = None
    permission = "rw"

    repo_id = seaserv.create_repo(repo_name, repo_desc, username, passwd)
    if not repo_id:
        return json_error(_(u'Failed to create'), 500)

    PersonalWiki.objects.save_personal_wiki(username=username, repo_id=repo_id)

    # create home page
    page_name = "home.md"
    if not seaserv.post_empty_file(repo_id, "/", page_name, username):
        return json_error(_(u'Failed to create home page. Please retry later'), 500)

    next = reverse('personal_wiki', args=[])
    return HttpResponse(json.dumps({'href': next}), content_type=content_type)

@login_required
def personal_wiki_page_new(request, page_name="home"):

    if request.method == 'POST':
        page_name = request.POST.get('page_name', '')
        if not page_name:
            return HttpResponseRedirect(request.META.get('HTTP_REFERER'))
        page_name = clean_page_name(page_name)

        repo = find_wiki_repo(request, group)
        if not repo:
            return render_error(request, _('Wiki is not found.'))

        filename = page_name + ".md"
        filepath = "/" + page_name + ".md"

        # check whether file exists
        if get_file_id_by_path(repo.id, filepath):
            return render_error(request, _('Page "%s" already exists.') % filename)

        if not post_empty_file(repo.id, "/", filename, request.user.username):
            return render_error(request, _('Failed to create wiki page. Please retry later.'))

        url = "%s?p=%s&from=wiki_page_new&gid=%s" % (
            reverse('file_edit', args=[repo.id]),
            urllib2.quote(filepath.encode('utf-8')), group.id)
        return HttpResponseRedirect(url)


@login_required
def personal_wiki_page_edit(request, page_name="home"):
    try:
        repo = get_personal_wiki_repo(request.user.username)
    except WikiDoesNotExist:
        return render_error(request, _('Wiki is not found.'))

    filepath = "/" + page_name + ".md"
    url = "%s?p=%s&from=personal_wiki_page_edit" % (
            reverse('file_edit', args=[repo.id]),
            urllib2.quote(filepath.encode('utf-8')))

    return HttpResponseRedirect(url)


@login_required
def personal_wiki_page_delete(request, page_name):
    try:
        repo = get_personal_wiki_repo(request.user.username)
    except WikiDoesNotExist:
        return render_error(request, _('Wiki is not found.'))
    
    file_name = page_name + '.md'
    username = request.user.username
    if del_file(repo.id, '/', file_name, username):
        messages.success(request, 'Successfully deleted "%s".' % page_name)
    else:
        messages.error(request, 'Failed to delete "%s". Please retry later.' % page_name)

    return HttpResponseRedirect(reverse('personal_wiki', args=[]))
