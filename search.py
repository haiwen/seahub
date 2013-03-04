import settings
import os
import stat
import simplejson as json
import re
import tempfile
import sys
import urllib
import urllib2
import logging
import chardet
from urllib import quote
from django.core.cache import cache
from django.core.urlresolvers import reverse
from django.core.mail import send_mail
from django.contrib import messages
from django.contrib.sites.models import Site, RequestSite
from django.db import IntegrityError
from django.db.models import F
from django.http import HttpResponse, HttpResponseBadRequest, Http404, \
    HttpResponseRedirect
from django.shortcuts import render_to_response, redirect
from django.template import Context, loader, RequestContext
from django.template.loader import render_to_string
from django.utils.hashcompat import md5_constructor
from django.utils.translation import ugettext as _
from django.views.generic.base import TemplateView, TemplateResponseMixin
from django.views.generic.edit import BaseFormView, FormMixin

from auth.decorators import login_required

from seahub.utils import search_file_by_name

@login_required
def search(request):
    keyword = request.GET['keyword']
    current_page = int(request.GET.get('page', '1'))
    per_page= int(request.GET.get('per_page', '25'))

    start = (current_page - 1) * per_page
    size = per_page
    results, total = search_file_by_name(request, keyword, start, size)

    if total > current_page * per_page:
        has_more = True
    else:
        has_more = False
        
    return render_to_response('search_results.html', {
            'keyword': keyword,
            'results': results,
            'total': total,
            'has_more': has_more,
            'current_page': current_page,
            'prev_page': current_page - 1,
            'next_page': current_page + 1,
            'per_page': per_page,
            }, context_instance=RequestContext(request))