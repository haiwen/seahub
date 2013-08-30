# -*- coding: utf-8 -*-
import logging
import urllib2

from django.db import IntegrityError
from django.utils.hashcompat import md5_constructor

from pysearpc import SearpcError
from seaserv import seafile_api

from seahub.base.models import UserStarredFiles
from seahub.utils import get_file_contributors

# Get an instance of a logger
logger = logging.getLogger(__name__)

# class StarredFile(object):
#     def format_path(self):
#         if self.path == "/":
#             return self.path

#         # strip leading slash
#         path = self.path[1:]
#         if path[-1:] == '/':
#             path = path[:-1]
#         return path.replace('/', ' / ')

#     def __init__(self, org_id, repo, path, is_dir, last_modified, size):
#         # always 0 for non-org repo
#         self.org_id = org_id
#         self.repo = repo
#         self.path = path
#         self.formatted_path = self.format_path()
#         self.is_dir = is_dir
#         # always 0 for dir
#         self.last_modified = last_modified
#         self.size = size
#         if not is_dir:
#             self.name = path.split('/')[-1]


# org_id > 0: get starred files in org repos
# org_id < 0: get starred files in personal repos
# def get_starred_files(email, org_id=-1):
#     """Return a list of starred files for some user, sorted descending by the
#     last modified time.

#     """
#     starred_files = UserStarredFiles.objects.filter(email=email, org_id=org_id)

#     ret = []
#     for sfile in starred_files:
#         # repo still exists?
#         try:
#             repo = seafile_api.get_repo(sfile.repo_id)
#         except SearpcError:
#             continue

#         if not repo:
#             sfile.delete()
#             continue

#         # file still exists?
#         file_id = ''
#         size = -1
#         if sfile.path != "/":
#             try:
#                 file_id = seafile_api.get_file_id_by_path(sfile.repo_id, sfile.path)
#                 size = seafile_api.get_file_size(file_id)
#             except SearpcError:
#                 continue

#             if not file_id:
#                 sfile.delete()
#                 continue

#         last_modified = 0
#         if not sfile.is_dir:
#             # last modified
#             path_hash = md5_constructor(urllib2.quote(sfile.path.encode('utf-8'))).hexdigest()[:12]
#             last_modified = get_file_contributors(sfile.repo_id, sfile.path, path_hash, file_id)[1]

#         f = StarredFile(sfile.org_id, repo, sfile.path, sfile.is_dir, last_modified, size)

#         ret.append(f)
#     ret.sort(lambda x, y: cmp(y.last_modified, x.last_modified))

#     return ret

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

