# -*- coding: utf-8 -*-
import logging

from rest_framework.views import APIView
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from rest_framework.response import Response
from rest_framework import status
from seaserv import seafile_api

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.permissions import IsProVersion
from seahub.api2.utils import api_error
from seahub.utils.repo import is_valid_repo_id_format
from seahub.utils import HAS_FILE_SEARCH, HAS_FILE_SEASEARCH
from seahub.wiki.models import Wiki
if HAS_FILE_SEARCH or HAS_FILE_SEASEARCH:
    from seahub.search.utils import search_files, ai_search_files, format_repos


logger = logging.getLogger('seafes')


class PublishedRepoSearchView(APIView):
    """ Search public repos
    """
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticatedOrReadOnly, IsProVersion)
    throttle_classes = (UserRateThrottle, )

    def get(self, request):
        # is search supported
        if not HAS_FILE_SEARCH and not HAS_FILE_SEASEARCH:
            error_msg = 'Search not supported.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # argument check
        keyword = request.GET.get('q', None)
        if not keyword:
            error_msg = 'q invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        repo_id = request.GET.get('repo_id', None)
        if not is_valid_repo_id_format(repo_id):
            error_msg = 'repo_id invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # recourse check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        wiki = Wiki.objects.filter(repo_id=repo_id)[0]
        if not wiki.has_read_perm(request):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        try:
            current_page = int(request.GET.get('page', '1'))
            per_page = int(request.GET.get('per_page', '10'))
            if per_page > 100:
                per_page = 100
        except ValueError:
            current_page = 1
            per_page = 10

        start = (current_page - 1) * per_page
        size = per_page
        if start < 0 or size < 0:
            error_msg = 'page or per_page invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if HAS_FILE_SEARCH:
            repo_id_map = {}
            map_id = repo.origin_repo_id if repo.origin_repo_id else repo_id
            repo_id_map[map_id] = repo
            # search file
            try:
                results, total = search_files(
                    repo_id_map, None, keyword, None, start, size, org_id=None
                )
            except Exception as e:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

            for result in results:
                result.pop('repo', None)
                result.pop('exists', None)
                result.pop('last_modified_by', None)
                result.pop('name_highlight', None)
                result.pop('score', None)
                result['repo_type'] = 'public'

            has_more = True if total > current_page * per_page else False

            return Response({
                "total": total,
                "results": results,
                "has_more": has_more
            })

        elif HAS_FILE_SEASEARCH:
            repos = [(repo.id, repo.origin_repo_id, repo.origin_path, repo.name)]
            searched_repos, repos_map = format_repos(repos)
            results, total = ai_search_files(keyword, searched_repos, per_page, [])

            for f in results:
                repo_id = f['repo_id']
                repo = repos_map.get(repo_id, None)
                if not repo:
                    continue
                real_repo_id = repo[0]
                origin_path = repo[1]
                repo_name = repo[2]
                f['repo_name'] = repo_name
                f.pop('_id', None)

                if origin_path:
                    if not f['fullpath'].startswith(origin_path):
                        # this operation will reduce the result items, but it will not happen now
                        continue
                    else:
                        f['repo_id'] = real_repo_id
                        f['fullpath'] = f['fullpath'].split(origin_path)[-1]

            return Response({"total": total, "results": results, "has_more": False})
