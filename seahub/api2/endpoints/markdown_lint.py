# Copyright (c) 2012-2018 Seafile Ltd.
# -*- coding: utf-8 -*-
import json
import logging

from rest_framework.views import APIView
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error
from seahub.utils.markdown_lint import check_header_one, check_heading_end_with


logger = logging.getLogger(__name__)


class MarkdownLintView(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    def post(self, request):
        """return a markdown lint issue list.
        """
        slate = request.data.get('slate')
        if not slate:
            error_msg = 'slate invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        try:
            slate = json.loads(slate)
        except Exception as e:
            logger.error(e)
            error_msg = 'slate invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        issue_list = []
        document_nodes = slate["document"]["nodes"]

        # check h1
        header_one_issue_list = check_header_one(document_nodes)
        if len(header_one_issue_list) > 0:
            issue_list.append(header_one_issue_list)

        # check heading_end_with
        heading_end_issue_list = check_heading_end_with(document_nodes)
        if len(heading_end_issue_list) > 0:
            issue_list.append(heading_end_issue_list)

        return Response({"issue_list": issue_list}, status=status.HTTP_200_OK)
