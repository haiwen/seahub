# Copyright (c) 2012-2018 Seafile Ltd.
# -*- coding: utf-8 -*-


def check_header_one(document_nodes):

    issue_list = []
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

    return issue_list


def check_heading_end_with(document_nodes):

    issue_list = []
    issue_count = 0
    position = []

    for index, node in enumerate(document_nodes):
        if node["type"].startswith("header_") and (
                node["nodes"][0]["leaves"][0]["text"].endswith(":") or
                node["nodes"][0]["leaves"][0]["text"].endswith("：")):
            issue_count += 1
            position.append(index)

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

    return issue_list
