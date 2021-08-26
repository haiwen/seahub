# Copyright (c) 2012-2016 Seafile Ltd.
# -*- coding: utf-8 -*-
"""
Management utility to create plan for user.
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
    help = 'Manually add a plan for user.'

    def handle(self, *args, **kwargs):
        logger.info('Start handling plan add command...')
        self.add_user_plan()
        logger.info('Finish handling plan add command.\n')

    def add_user_plan(self):
        try:
            username = input("Username: ")
            plan = input("Plan (Free, A, B) ")
            months = input("Months: ")

            expire_date = timezone.now() + relativedelta(months=int(months))
            UserPlan.objects.create_or_update_user_plan(username, plan,
                                                        expire_date)
        except KeyboardInterrupt:
            self.stderr.write("\nOperation cancelled.")
            sys.exit(1)

