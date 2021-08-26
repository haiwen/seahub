# Copyright (c) 2012-2016 Seafile Ltd.
# -*- coding: utf-8 -*-
"""
Management utility to query plan for user.
"""
import sys
import logging
from dateutil.relativedelta import relativedelta
from django.core.management.base import BaseCommand, CommandError
from django.utils.encoding import force_str, force_text
from django.utils import timezone

from seahub.plan.models import UserPlan

# Get an instance of a logger
logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Manually query a plan for user.'

    def handle(self, *args, **kwargs):
        logger.info('Start handling plan query command...')
        self.expire_user_plan()
        logger.info('Finish handling plan query command.\n')

    def expire_user_plan(self):
        try:
            username = input("Username: ")

            user_plan = UserPlan.objects.get_valid_plan_by_user(username)
            if user_plan is None:
                print("Username: %s, Plan type: Free." % username)
                sys.exit(1)

            print("Username: %s, Plan type: %s, Expire at: %s" % \
                (username, user_plan.plan_type, user_plan.expire_date))
        except KeyboardInterrupt:
            self.stderr.write("\nOperation cancelled.")
            sys.exit(1)

