import logging

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from django.template.defaultfilters import filesizeformat
from seaserv import seafile_api

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error, is_wiki_repo
from seahub.base.templatetags.seahub_tags import email2nickname, email2contact_email
from seahub.group.utils import group_id_to_name
from seahub.utils.repo import normalize_repo_status_code
from seahub.utils.timeutils import timestamp_to_isoformat_timestr
from seahub.wiki2.models import Wiki2Publish
from seahub.api2.endpoints.group_owned_libraries import get_group_id_by_repo_owner



logger = logging.getLogger(__name__)


def get_wiki_info(wiki, publish_wiki_ids):

    wiki_owner = seafile_api.get_repo_owner(wiki.repo_id)
    if not wiki_owner:
        try:
            org_wiki_owner = seafile_api.get_org_repo_owner(wiki.repo_id)
        except Exception:
            org_wiki_owner = None

    owner = wiki_owner or org_wiki_owner or ''
    result = {}
    result['id'] = wiki.repo_id
    result['name'] = wiki.repo_name
    result['owner'] = owner
    result['owner_email'] = owner
    result['owner_contact_email'] = email2contact_email(owner)
    result['size'] = wiki.size
    result['size_formatted'] = filesizeformat(wiki.size)
    result['encrypted'] = wiki.encrypted
    result['file_count'] = wiki.file_count
    result['status'] = normalize_repo_status_code(wiki.status)
    result['last_modified'] = timestamp_to_isoformat_timestr(wiki.last_modified)
    result["is_published"] = True if wiki.repo_id in publish_wiki_ids else False

    if '@seafile_group' in owner:
        group_id = get_group_id_by_repo_owner(owner)
        result['group_name'] = group_id_to_name(group_id)
        result['owner_name'] = group_id_to_name(group_id)
    else:
        result['owner_name'] = email2nickname(owner)

    return result


class AdminWikis(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsAdminUser,)

    def get(self, request):
        """ List 'all' wiki

        Permission checking:
        1. only admin can perform this action.
        """

        if not request.user.admin_permissions.can_manage_library():
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        order_by = request.GET.get('order_by', '').lower().strip()
        if order_by and order_by not in ('size', 'file_count'):
            error_msg = 'order_by invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # get wikis by page
        try:
            current_page = int(request.GET.get('page', '1'))
            per_page = int(request.GET.get('per_page', '100'))
        except ValueError:
            current_page = 1
            per_page = 100

        start = (current_page - 1) * per_page
        limit = per_page + 1
        if order_by:
            repos_all = seafile_api.get_repo_list(-1, -1, order_by)
        else:
            repos_all = seafile_api.get_repo_list(-1, -1)
        all_wikis = [r for r in repos_all if is_wiki_repo(r)][start: start+limit]
        if len(all_wikis) > per_page:
            all_wikis = all_wikis[:per_page]
            has_next_page = True
        else:
            has_next_page = False

        # get publish wiki
        wiki_ids = [w.repo_id for w in all_wikis]
        publish_wiki_ids = []
        published_wikis = Wiki2Publish.objects.filter(repo_id__in=wiki_ids)
        for w in published_wikis:
            publish_wiki_ids.append(w.repo_id)

        all_fmt_wikis = []
        for wiki in all_wikis:
            repo_info = get_wiki_info(wiki, publish_wiki_ids)
            all_fmt_wikis.append(repo_info)

        page_info = {
            'has_next_page': has_next_page,
            'current_page': current_page
        }

        return Response({"page_info": page_info, "wikis": all_fmt_wikis})
