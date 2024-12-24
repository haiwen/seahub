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
from seahub.api2.utils import api_error
from seahub.utils import get_service_url
from seahub.base.templatetags.seahub_tags import email2nickname, email2contact_email
from seahub.group.utils import group_id_to_name
from seahub.utils.repo import normalize_repo_status_code
from seahub.utils.timeutils import timestamp_to_isoformat_timestr
from seahub.wiki2.models import Wiki2Publish
from seahub.api2.endpoints.group_owned_libraries import get_group_id_by_repo_owner
from seahub.utils.db_api import SeafileDB



logger = logging.getLogger(__name__)


def get_wiki_info(wiki, publish_wikis_dict):

    wiki_owner = seafile_api.get_repo_owner(wiki.repo_id)
    if not wiki_owner:
        try:
            org_wiki_owner = seafile_api.get_org_repo_owner(wiki.repo_id)
        except Exception:
            org_wiki_owner = None
    owner = wiki_owner or org_wiki_owner or ''
    link_prefix = get_service_url().rstrip('/') + '/wiki/publish/'
    url_string = publish_wikis_dict.get(wiki.repo_id) if wiki.repo_id in publish_wikis_dict else ""
    link = link_prefix + url_string if url_string else ""

    result = {}
    result['id'] = wiki.repo_id
    result['name'] = wiki.wiki_name
    result['owner'] = owner
    result['owner_email'] = owner
    result['owner_contact_email'] = email2contact_email(owner)
    result['size'] = wiki.size if wiki.size else 0
    result['size_formatted'] = filesizeformat(wiki.size)
    result['encrypted'] = wiki.encrypted
    result['file_count'] = wiki.file_count if wiki.file_count else 0
    result['status'] = normalize_repo_status_code(wiki.status)
    result['last_modified'] = timestamp_to_isoformat_timestr(wiki.last_modified)
    result['url_string'] = url_string
    result['link'] = link

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
        seafile_db = SeafileDB()
        all_wikis = seafile_db.get_all_wikis(start, limit, order_by)
        if len(all_wikis) > per_page:
            all_wikis = all_wikis[:per_page]
            has_next_page = True
        else:
            has_next_page = False

        # get publish wiki
        wiki_ids = [w.repo_id for w in all_wikis]
        publish_wikis_dict = {}
        published_wikis = Wiki2Publish.objects.filter(repo_id__in=wiki_ids)
        for w in published_wikis:
            publish_wikis_dict[w.repo_id] = w.publish_url

        all_fmt_wikis = []
        for wiki in all_wikis:
            repo_info = get_wiki_info(wiki, publish_wikis_dict)
            all_fmt_wikis.append(repo_info)

        page_info = {
            'has_next_page': has_next_page,
            'current_page': current_page
        }

        return Response({"page_info": page_info, "wikis": all_fmt_wikis})
