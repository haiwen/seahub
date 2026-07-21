from django.db.models import Sum, Value
from django.db.models.functions import Coalesce

from seahub.ai.models import AIUsageStatistics


def query_ai_statistics_overview(group_by, date_range, org_id=None):
    date_begin, date_end = date_range
    query_kwargs = {
        'date__gte': date_begin,
        'date__lte': date_end,
    }

    if group_by == 'username':
        query_kwargs['username__isnull'] = False
        group_fields = ['username']
        if not org_id:
            group_fields.append('org_id')
    elif group_by == 'repo_id':
        query_kwargs['repo_id__isnull'] = False
        group_fields = ['repo_id', 'repo_owner', 'group_id']
        if not org_id:
            group_fields.append('org_id')
    elif group_by == 'group_id':
        query_kwargs['group_id__isnull'] = False
        group_fields = ['group_id']
        if not org_id:
            group_fields.append('org_id')
    elif group_by == 'org_id':
        if not org_id:
            query_kwargs['org_id__isnull'] = False
        group_fields = ['org_id']
    elif group_by == 'scenario':
        group_fields = ['scenario']
    else:
        raise AssertionError(f'Invalid group_by type: {group_by}')

    if org_id:
        query_kwargs['org_id'] = org_id

    return AIUsageStatistics.objects.filter(**query_kwargs).values(
        *group_fields
    ).annotate(
        total_credit_used=Coalesce(Sum('cost'), Value(0.0))
    ).order_by(
        '-total_credit_used'
    )


def query_ai_statistics_detail(group_by, date_range, condition, scenarios=None):
    date_begin, date_end = date_range
    query_kwargs = {
        'date__gte': date_begin,
        'date__lte': date_end,
    }

    if 'username' in condition:
        query_kwargs['username'] = condition['username']
    if 'repo_id' in condition:
        query_kwargs['repo_id'] = condition['repo_id']
    if 'repo_owner' in condition:
        query_kwargs['repo_owner'] = condition['repo_owner']
    if 'group_id' in condition:
        query_kwargs['group_id'] = int(condition['group_id'])
    if 'org_id' in condition:
        query_kwargs['org_id'] = int(condition['org_id'])
    if scenarios:
        query_kwargs['scenario__in'] = scenarios

    return AIUsageStatistics.objects.filter(
        **query_kwargs
    ).values(
        group_by
    ).annotate(
        total_input_tokens=Coalesce(Sum('input_tokens'), Value(0)),
        total_output_tokens=Coalesce(Sum('output_tokens'), Value(0)),
        total_credit_used=Coalesce(Sum('cost'), Value(0.0)),
    ).order_by(
        'date' if group_by == 'date' else '-total_credit_used'
    )
