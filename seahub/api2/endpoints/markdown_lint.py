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


logger = logging.getLogger(__name__)


class MarkdownLintView(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    def post(self, request):
        """return a markdown lint issue list.
        """
        LEVEL_ERROR = "Error"
        LEVEL_WARNING = "Warning"
        LEVEL_HINT = "Hint"

        slate = request.data.get('slate')
        if not slate:
            error_msg = 'slate invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        slate = json.loads(slate)

        issue_list = []
        document_nodes = slate["document"]["nodes"]

        # check header_one
        position = 0
        has_header_one = False
        for index, node in enumerate(document_nodes):
            if node["type"] == "header_one":
                position = index
                has_header_one = True

        if not has_header_one:
            issue = dict()
            issue["position"] = position
            issue["level"] = LEVEL_HINT
            issue["issue"] = "Missing h1."
            issue_list.append(issue)

        return Response({"issue_list": issue_list}, status=status.HTTP_200_OK)
