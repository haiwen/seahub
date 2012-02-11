from django.db import models
from django.contrib.auth.models import User
from django.utils.translation import ugettext_lazy as _


class Group(models.Model):
    """A group is identified uniquely by group_id."""

    group_id = models.CharField(max_length=36, primary_key=True, db_column='uuid')
    name = models.CharField(max_length=20, editable=False, unique=True)
    creator = models.ForeignKey(User, verbose_name=_("creator"), related_name="%(class)s_created")
    admin = models.ForeignKey(User, verbose_name=_("admin"), related_name="%(class)s_admined")
    ctime = models.DateTimeField('create time', editable=False)
    description = models.TextField(_("description"))
    users = models.ManyToManyField(User)

    def __unicode__(self):
        return self.name


class JoinRequest(models.Model):
    """A request for joining a group."""
    group = models.ForeignKey(Group)
    user = models.ForeignKey(User)
    ctime = models.DateTimeField('create time', editable=False)


class Invitation(models.Model):
    """An invitation for joining a group."""

    group = models.ForeignKey(Group)
    user = models.ForeignKey(User)
    ctime = models.DateTimeField('create time', editable=False)
