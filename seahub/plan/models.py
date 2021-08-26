# Copyright (c) 2012-2016 Seafile Ltd.
import logging

from django.db import models
from django.utils import timezone

# Get an instance of a logger
logger = logging.getLogger(__name__)

class UserPlanManager(models.Manager):
    def create_or_update_user_plan(self, username, plan_type, expire_date):
        try:
            user_plan = self.get(username=username)
            user_plan.plan_type = plan_type
            user_plan.expire_date = expire_date
        except self.model.DoesNotExist:
            user_plan = self.model(username=username, plan_type=plan_type,
                                   expire_date=expire_date)
        user_plan.save(using=self._db)
        return user_plan

    def get_valid_plan_by_user(self, username):
        """Return a user's valid plan which is not expired.
        """
        try:
            user_plan = self.get(username=username,
                                 expire_date__gt=timezone.now())
        except self.model.DoesNotExist:
            user_plan = None
        except Exception as e:
            logger.error(e)
            user_plan = None
        return user_plan
    
class UserPlan(models.Model):
    username = models.CharField(max_length=255, db_index=True)
    plan_type = models.CharField(max_length=10)
    expire_date = models.DateTimeField(db_index=True)
    objects = UserPlanManager()

########## org plan
class OrgPlanManager(models.Manager):
    def create_or_update_org_plan(self, org_id, plan_type, num_of_users,
                                  expire_date):
        try:
            org_plan = self.get(org_id=org_id)
            org_plan.plan_type = plan_type
            org_plan.num_of_users = num_of_users
            org_plan.expire_date = expire_date
        except self.model.DoesNotExist:
            org_plan = self.model(org_id=org_id, plan_type=plan_type,
                                  num_of_users=num_of_users,
                                  expire_date=expire_date)
        org_plan.save(using=self._db)
        return org_plan

    def get_plan_by_org(self, org_id):
        """Return an org's plan.
        """
        try:
            org_plan = self.get(org_id=org_id)
        except self.model.DoesNotExist:
            org_plan = None
        except Exception as e:
            logger.error(e)
            org_plan = None
        return org_plan

    def get_valid_plan_by_org(self, org_id):
        """Return a org's valid plan which is not expired.
        """
        try:
            org_plan = self.get(org_id=org_id,
                                expire_date__gt=timezone.now())
        except self.model.DoesNotExist:
            org_plan = None
        except Exception as e:
            logger.error(e)

            org_plan = None
        return org_plan

class OrgPlan(models.Model):
    org_id = models.IntegerField(db_index=True)
    plan_type = models.CharField(max_length=10)
    num_of_users = models.IntegerField()
    expire_date = models.DateTimeField(db_index=True)
    objects = OrgPlanManager()
