# Copyright (c) 2012-2018 Seafile Ltd.
# -*- coding: utf-8 -*-
import re
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
        slate = request.data.get('slate')
        if not slate:
            error_msg = 'slate invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        slate = json.loads(slate)

        issue_list = []
        document_nodes = slate["document"]["nodes"]

        # check h1
        issue_count = 0
        position = []
        for index, node in enumerate(document_nodes):
            if node["type"] == "header_one":
                issue_count += 1  # issue < 1: missing h1; issue > 1: multiple h1.
                position.append(index)

        if issue_count < 1:
            issue = dict()
            issue["issue"] = "Missing h1."
            issue["issue_code"] = "missing_h1"
            issue_list.append(issue)
        # if issue_count > 1:
            # TODO

        # check heading_end_with
        issue_count = 0
        position = []
        for index, node in enumerate(document_nodes):
            if node["type"].startswith("header_") and (
                    node["nodes"][0]["leaves"][0]["text"].endswith(":") or
                    node["nodes"][0]["leaves"][0]["text"].endswith("：")):
                issue_count += 1
                position.append(index)
                print node["nodes"][0]["leaves"][0]["text"]

        if issue_count > 0:
            issue = dict()
            issue["issue"] = "Heading end with colon."
            issue["issue_code"] = "heading_end_with_colon"
            issue["detail"] = []
            for index in position:
                detail = dict()
                detail["position"] = index
                detail["description"] = "Trailing punctuation in heading should not be a colon."
                issue["detail"].append(detail)
            issue_list.append(issue)

        return Response({"issue_list": issue_list}, status=status.HTTP_200_OK)
