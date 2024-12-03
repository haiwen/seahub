# Copyright (c) 2012-2016 Seafile Ltd.
import posixpath

from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from django.utils.translation import gettext as _

from seaserv import seafile_api
from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error, user_to_dict

from seahub.base.templatetags.seahub_tags import email2nickname
from seahub.base.accounts import User
from seahub.tags.models import FileUUIDMap
from seahub.views import check_folder_permission
from seahub.utils import is_valid_username
from seahub.drafts.signals import request_reviewer_successful

