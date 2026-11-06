import re

import requests

from seahub.settings import SEAFILE_AI_SERVER_URL
from seahub.ai.utils import gen_headers


def get_builtin_skills():
    response = requests.get(SEAFILE_AI_SERVER_URL.rstrip('/') + '/api/v1/skills',
                            headers=gen_headers(), timeout=10)
    response.raise_for_status()
    skills = response.json()['skills']
    if not isinstance(skills, list):
        raise ValueError('Invalid builtin skill list')
    return skills


def extract_skill_command(query):
    match = re.match(r'^\s*/([a-z0-9]+(?:-[a-z0-9]+)*)(?=\s|$)', query)
    if not match:
        return None, query
    return match.group(1), query[match.end():].lstrip()
