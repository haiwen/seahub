#!/usr/bin/env python
# encoding: utf-8
import re
import settings
import time
from django.shortcuts import render_to_response
from django.template import RequestContext
from django.utils.hashcompat import sha_constructor

from seaserv import get_commits

def go_permission_error(request, msg=None):
    """
    Return permisson error page.

    """
    return render_to_response('permission_error.html', {
            'error_msg': msg or u'权限错误',
            }, context_instance=RequestContext(request))

def go_error(request, msg=None):
    """
    Return normal error page.

    """
    return render_to_response('error.html', {
            'error_msg': msg or u'内部错误',
            }, context_instance=RequestContext(request))

def list_to_string(l):
    """
    Return string of a list.

    """
    return ','.join(l)

def get_httpserver_root():
    """
    Get seafile http server address and port from settings.py,
    and cut out last '/'.

    """
    if settings.HTTP_SERVER_ROOT[-1] == '/':
        http_server_root = settings.HTTP_SERVER_ROOT[:-1]
    else:
        http_server_root = settings.HTTP_SERVER_ROOT
    return http_server_root

def get_ccnetapplet_root():
    """
    Get ccnet applet address and port from settings.py,
    and cut out last '/'.

    """
    if settings.CCNET_APPLET_ROOT[-1] == '/':
        ccnet_applet_root = settings.CCNET_APPLET_ROOT[:-1]
    else:
        ccnet_applet_root = settings.CCNET_APPLET_ROOT
    return ccnet_applet_root

def gen_token():
    """
    Generate short token used for owner to access repo file.

    """

    token = sha_constructor(settings.SECRET_KEY + unicode(time.time())).hexdigest()[:5]
    return token

def validate_group_name(group_name):
    """
    Check whether group name is valid.
    A valid group name only contains alphanumeric character.

    """
    return re.match('^\w+$', group_name, re.U)

def calculate_repo_last_modify(repo_list):
    """
    Get last modify time for repo. 
    
    """
    for repo in repo_list:
        try:
            repo.latest_modify = get_commits(repo.id, 0, 1)[0].ctime
        except:
            repo.latest_modify = None
            continue

