# Copyright (c) 2012-2016 Seafile Ltd.
import os
import json
import logging
import posixpath

from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from seaserv import seafile_api

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.endpoints.utils import add_org_context
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error
from seahub.constants import PERMISSION_READ_WRITE
from seahub.tags.models import FileUUIDMap
from seahub.views import check_folder_permission

logger = logging.getLogger(__name__)

HTTP_520_OPERATION_FAILED = 520

