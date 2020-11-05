# Copyright (c) 2012-2018 Seafile Ltd.
# -*- coding: utf-8 -*-


def check_heading_one(document_nodes):

    issue_list = []
    h1_count = 0
    position_list = []

    for position, node in enumerate(document_nodes):
        if node["type"] == "header_one":
            h1_count += 1
            position_list.append(position)

    if h1_count < 1:
        issue = dict()
        issue["issue"] = "Missing h1."
        issue["issue_code"] = "missing_h1"
        issue_list.append(issue)

    return issue_list


def check_heading_end_with(document_nodes):

    issue_list = []
    issue_count = 0
    position_list = []

    for position, node in enumerate(document_nodes):
        if node["type"].startswith("header_") and (
                node["nodes"][0]["leaves"][0]["text"].endswith(":") or
                node["nodes"][0]["leaves"][0]["text"].endswith("：")):
            issue_count += 1
            position_list.append(position)

    if issue_count > 0:
        issue = dict()
        issue["issue"] = "Heading end with colon."
        issue["issue_code"] = "heading_end_with_colon"
        issue["detail"] = []
        for position in position_list:
            detail = dict()
            detail["position"] = position
            detail["description"] = "Trailing punctuation in heading should not be a colon."
            issue["detail"].append(detail)
        issue_list.append(issue)

    return issue_list


def check_heading_increase(document_nodes):
    """ Only check h1, h2, h3, h4. Don't check h5, h6.
    """

    issue_list = []
    issue_count = 0
    heading_list = []
    position_list = []

    for position, node in enumerate(document_nodes):
        # init heading data, e.g. {"heading_level": 2, "position": 1}
        heading_dict = dict()
        if node["type"].startswith("header_one"):
            heading_dict["heading_level"] = 1
            heading_dict["position"] = position
            heading_list.append(heading_dict)
        elif node["type"].startswith("header_two"):
            heading_dict["heading_level"] = 2
            heading_dict["position"] = position
            heading_list.append(heading_dict)
        elif node["type"].startswith("header_three"):
            heading_dict["heading_level"] = 3
            heading_dict["position"] = position
            heading_list.append(heading_dict)
        elif node["type"].startswith("header_four"):
            heading_dict["heading_level"] = 4
            heading_dict["position"] = position
            heading_list.append(heading_dict)

    for index, heading in enumerate(heading_list[1:]):
        # The level of the current heading minus the level of the previous heading
        if heading["heading_level"] - heading_list[index]["heading_level"] > 1:
            issue_count += 1
            position_list.append(heading["position"])

    if issue_count > 0:
        issue = dict()
        issue["issue"] = "Heading increase irregular."
        issue["issue_code"] = "heading_increase_irregular"
        issue["detail"] = []
        for position in position_list:
            detail = dict()
            detail["position"] = position
            detail["description"] = "Heading levels should only increment by one level at a time."
            issue["detail"].append(detail)
        issue_list.append(issue)

    return issue_list
