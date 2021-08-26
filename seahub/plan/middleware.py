# Copyright (c) 2012-2016 Seafile Ltd.
import re
from datetime import datetime, timedelta
import logging

from django.urls import reverse
from django.utils import timezone
from django.http import HttpResponseRedirect
from django.utils.deprecation import MiddlewareMixin

from .models import UserPlan, OrgPlan
from .settings import PLAN, ORG_PLAN, ORG_PLAN_FREE
from seahub.organizations.settings import ORG_TRIAL_DAYS
from seahub.settings import SITE_ROOT

# Get an instance of a logger
logger = logging.getLogger(__name__)

class PlanMiddleware(MiddlewareMixin):
    def _request_in_black_list(self, request):
        path = request.path
        black_list = (r'^%s$' % SITE_ROOT, r'home/.+', r'repo/.+',
                      r'[f|d]/[a-f][0-9]{10}', r'group/\d+', r'groups/', r'share/')

        for patt in black_list:
            if re.search(patt, path) is not None:
                return True
        return False

    def process_request(self, request):
        if not request.user.is_authenticated:
            return None
        
        if request.cloud_mode and request.user.org is not None:
            org_id = request.user.org.org_id
            op = OrgPlan.objects.get_plan_by_org(org_id)
            if op:
                plan = op.plan_type
                request.user.org_plan_type = plan
                request.user.org_storage = int(ORG_PLAN[plan]['storage'])
                request.user.org_members = int(ORG_PLAN[plan]['members'])
                request.user.org_plan_desc = ORG_PLAN[plan]['desc']
                request.user.org_plan_expire = op.expire_date
            else:
                plan = ORG_PLAN_FREE
                request.user.org_plan_type = plan
                request.user.org_storage = int(ORG_PLAN[plan]['storage'])
                request.user.org_members = int(ORG_PLAN[plan]['members'])
                request.user.org_plan_desc = ORG_PLAN[plan]['desc']
                request.user.org_plan_expire = datetime.fromtimestamp(request.user.org.ctime / 1e6) + timedelta(days=ORG_TRIAL_DAYS)

                delta = timezone.now() - datetime.fromtimestamp(request.user.org.ctime / 1e6)

                if ORG_TRIAL_DAYS >= 0 and delta.days >= ORG_TRIAL_DAYS:
                    # redirect user a seperate payment page when user visites
                    # certain pages
                    if self._request_in_black_list(request):
                        return HttpResponseRedirect(reverse('finish_payment'))

        elif request.cloud_mode:
            # get user plan from db, use "Free" as default
            username = request.user.username
            up = UserPlan.objects.get_valid_plan_by_user(username)
            plan = 'Free' if up is None else up.plan_type

            request.user.storage = int(PLAN[plan]['storage'])
            request.user.share_link_traffic = int(PLAN[plan]['share_link_traffic'])
            request.user.num_of_groups = int(PLAN[plan]['num_of_groups'])
            request.user.group_members = int(PLAN[plan]['group_members'])
            request.user.plan_type = plan
            request.user.plan_desc = PLAN[plan]['desc']
            request.user.plan_expire = up.expire_date if up else None
        else:
            request.user.num_of_groups = -1
            request.user.group_members = -1

        return None

    def process_response(self, request, response):
        return response
