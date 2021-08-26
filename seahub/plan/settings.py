# Copyright (c) 2012-2016 Seafile Ltd.
from django.conf import settings

DEFAULT_PLAN = {
    'Free': {
        'num_of_groups': 3,
        'group_members': 6,
        },
    'A': {
        'num_of_groups': 8,
        'group_members': 16,
        },
    'B': {
        'num_of_groups': -1,    # no limit
        'group_members': -1,    # no limit
        },
}

PLAN = getattr(settings, 'PLAN', DEFAULT_PLAN)

ORG_PLAN_PRO = 'pro'
ORG_PLAN_FREE = 'free'
DEFAULT_ORG_PLAN = {
    'free': {
        'desc': 'Free',
        'storage': 1,           # GB
        'traffic': 5,           # GB/month
        'groups': -1,           # no limit
        'members': -1,
        'pricing': 0,
        },
    ORG_PLAN_PRO: {
        'desc': 'Professional',
        'storage': 100,           # GB
        'traffic': 100,           # GB/month
        'groups': -1,           # no limit
        'members': 10,
        'pricing': 25,          # $/month
        },
}
ORG_PLAN = getattr(settings, 'ORG_PLAN', DEFAULT_ORG_PLAN)
