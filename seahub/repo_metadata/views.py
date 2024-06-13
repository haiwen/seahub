import requests, stat, posixpath, jwt, time
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework.views import APIView
from seahub.api2.utils import api_error, to_python_boolean
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.authentication import TokenAuthentication
from seahub.repo_metadata.models import RepoMetadata
from seahub.settings import ENABLE_METADATA_MANAGEMENT, MATEDATA_SERVER_URL, METEDATA_SERVER_SECRET_KEY
from seahub.views import check_folder_permission
from seahub.utils.timeutils import timestamp_to_isoformat_timestr
from seaserv import seafile_api
from seahub.auth.decorators import login_required
from seahub.seahub.base.decorators import repo_passwd_set_required


@login_required
@repo_passwd_set_required
def view_metadata(request, repo_id):
    pass