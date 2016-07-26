# Copyright (c) 2012-2016 Seafile Ltd.
# -*- coding: utf-8 -*-
import logging
import urllib2

from django.db import IntegrityError

from pysearpc import SearpcError
from seaserv import seafile_api

from seahub.base.models import UserStarredFiles

# Get an instance of a logger
logger = logging.getLogger(__name__)

def star_file(email, repo_id, path, is_dir, org_id=-1):
    if is_file_starred(email, repo_id, path, org_id):
        return

    f = UserStarredFiles(email=email,
                         org_id=org_id,
                         repo_id=repo_id,
                         path=path,
                         is_dir=is_dir)
    try:
        f.save()
    except IntegrityError, e:
        logger.warn(e)

def unstar_file(email, repo_id, path):
    # Should use "get", but here we use "filter" to fix the bug caused by no
    # unique constraint in the table
    result = UserStarredFiles.objects.filter(email=email,
                                             repo_id=repo_id,
                                             path=path)
    for r in result:
        r.delete()
            
def is_file_starred(email, repo_id, path, org_id=-1):
    # Should use "get", but here we use "filter" to fix the bug caused by no
    # unique constraint in the table
    result = UserStarredFiles.objects.filter(email=email,
                                             repo_id=repo_id,
                                             path=path,
                                             org_id=org_id)
    n = len(result)
    if n == 0:
        return False
    else:
        # Fix the bug caused by no unique constraint in the table
        if n > 1:
            for r in result[1:]:
                r.delete()
        return True

def get_dir_starred_files(email, repo_id, parent_dir, org_id=-1): 
    '''Get starred files under parent_dir.

    '''
    starred_files = UserStarredFiles.objects.filter(email=email,
                                         repo_id=repo_id,
                                         path__startswith=parent_dir,
                                         org_id=org_id)
    return [ f.path for f in starred_files ]

