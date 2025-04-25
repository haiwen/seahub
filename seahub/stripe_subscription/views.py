# Copyright (c) 2012-2020 Seafile Ltd.
# encoding: utf-8
import requests
import logging
from django.shortcuts import render
from django.utils.translation import gettext as _
from django.http import HttpResponseRedirect

from seahub.utils import render_error, is_org_context
from seahub.auth.decorators import login_required
from .utils import subscription_check, subscription_permission_check, \
    get_subscription_api_headers, get_customer_id, handler_subscription_api_response
from .settings import STRIPE_SUBSCRIPTION_SERVER_URL

logger = logging.getLogger(__name__)


@login_required
def subscription_view(request):
    """
    subscription
    """
    if not subscription_check():
        return render_error(request, _('Feature is not enabled.'))

    if is_org_context(request):
        return render_error(request, _('Permission denied.'))

    return_dict = {}
    template = 'subscription/subscription_react.html'
    return render(request, template, return_dict)


@login_required
def subscription_pay_view(request):
    """
    subscription
    """
    if not subscription_check():
        return render_error(request, _('Feature is not enabled.'))

    if not subscription_permission_check(request):
        error_msg = _('Permission denied.')
        return render_error(request, error_msg)

    plan_id = request.GET.get('plan_id')
    payment_source = request.GET.get('payment_source')
    payment_type = request.GET.get('payment_type')
    count = request.GET.get('count')
    asset_quota = request.GET.get('asset_quota')
    total_amount = request.GET.get('total_amount')

    # main
    try:
        customer_id = get_customer_id(request)
        headers = get_subscription_api_headers()

        data = {
            'customer_id': customer_id,
            'plan_id': plan_id,
            'payment_source': payment_source,
            'payment_type': payment_type,
            'total_amount': total_amount,
        }
        if count:
            data['count'] = count
        if asset_quota:
            data['asset_quota'] = asset_quota

        url = STRIPE_SUBSCRIPTION_SERVER_URL.rstrip('/') + '/api/seafile/subscription/pay/'
        response = requests.post(url, json=data, headers=headers)
        response = handler_subscription_api_response(response)
        response_dic = response.json()
        if response.status_code >= 400:
            error_msg = response_dic.get('error_msg')
            if 'non_field_errors' in response_dic and response_dic['non_field_errors']:
                error_msg = response_dic['non_field_errors'][0]
            return render_error(request, error_msg)

        use_redirect_url = response_dic.get('use_redirect_url')
        redirect_url = response_dic.get('redirect_url')

        if use_redirect_url and redirect_url:
            return HttpResponseRedirect(redirect_url)

        if not use_redirect_url:
            return render(request, 'subscription/pay_result.html', {'info': '支付成功'})
    except Exception as e:
        logger.error(e)
        error_msg = _('Internal Server Error')
        return render_error(request, error_msg)
