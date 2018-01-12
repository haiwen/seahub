import os
import logging

import seaserv
from seaserv import seafile_api
from django.core.urlresolvers import reverse
from django.http import HttpResponse, HttpResponseBadRequest, Http404, \
    HttpResponseRedirect
from django.shortcuts import render_to_response
from django.template import Context, loader, RequestContext
from django.utils.translation import ugettext as _

import seaserv
from seaserv import seafile_api
from pysearpc import SearpcError

from seahub.auth.decorators import login_required
from seahub.base.decorators import user_mods_check
from seahub.wiki.models import PersonalWiki, WikiDoesNotExist, WikiPageMissing
from seahub.wiki import get_personal_wiki_page, get_personal_wiki_repo, \
    convert_wiki_link, get_wiki_pages
from seahub.wiki.forms import WikiCreateForm, WikiNewPageForm
from seahub.wiki.utils import clean_page_name, page_name_to_file_name
from seahub.utils import render_error
from seahub.views import check_folder_permission

# Get an instance of a logger
logger = logging.getLogger(__name__)


@login_required
def slug(request, slug, page_name="home"):
    assert False, 'TODO'
