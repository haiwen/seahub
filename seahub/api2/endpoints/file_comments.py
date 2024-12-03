# Copyright (c) 2012-2016 Seafile Ltd.
import logging

from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from seaserv import seafile_api
from pysearpc import SearpcError
from django.urls import reverse

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.permissions import IsRepoAccessible
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error, user_to_dict, to_python_boolean
from seahub.avatar.settings import AVATAR_DEFAULT_SIZE
from seahub.base.models import FileComment 
from seahub.utils.repo import get_repo_owner
from seahub.signals import comment_file_successful
from seahub.api2.endpoints.utils import generate_links_header_for_paginator
from seahub.views import check_folder_permission

logger = logging.getLogger(__name__)

