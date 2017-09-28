# Copyright (c) 2012-2016 Seafile Ltd.
from django.db import models

class AdminRoleManager(models.Manager):

    def add_admin_role(self, username, role):
        """ Add admin role.
        """
        amdin_role = self.model(email=username, role=role)
        amdin_role.save(using=self._db)
        return role

    def update_admin_role(self, username, role):
        """ Update admin role.
        """
        amdin_role = self.get(email=username)
        amdin_role.role = role
        amdin_role.save(using=self._db)
        return amdin_role

    def get_admin_role(self, username):
        """ Get admin role of a user.
        """
        return super(AdminRoleManager, self).get(email=username)


class AdminRole(models.Model):
    email = models.EmailField(unique=True, db_index=True)
    role = models.CharField(max_length=255)

    objects = AdminRoleManager()
