# Copyright (c) 2012-2016 Seafile Ltd.
from django.db import models
from django.core.urlresolvers import reverse
from django.utils import timezone
from django.utils.translation import ugettext_lazy as _
from seaserv import seafile_api

from seahub.base.fields import LowerCaseCharField
from seahub.base.templatetags.seahub_tags import email2nickname
from seahub.utils import get_site_scheme_and_netloc
from seahub.utils.timeutils import (timestamp_to_isoformat_timestr,
                                    datetime_to_isoformat_timestr)

class WikiDoesNotExist(Exception):
    pass

class WikiPageMissing(Exception):
    pass

class PersonalWikiManager(models.Manager):
    def save_personal_wiki(self, username, repo_id):
        """
        Create or update group wiki.
        """
        try:
            wiki = self.get(username=username)
            wiki.repo_id = repo_id
        except self.model.DoesNotExist:
            wiki = self.model(username=username, repo_id=repo_id)
        wiki.save(using=self._db)
        return wiki

class PersonalWiki(models.Model):
    username = LowerCaseCharField(max_length=255, unique=True)
    repo_id = models.CharField(max_length=36)
    objects = PersonalWikiManager()

class GroupWikiManager(models.Manager):
    def save_group_wiki(self, group_id, repo_id):
        """
        Create or update group wiki.
        """
        try:
            groupwiki = self.get(group_id=group_id)
            groupwiki.repo_id = repo_id
        except self.model.DoesNotExist:
            groupwiki = self.model(group_id=group_id, repo_id=repo_id)
        groupwiki.save(using=self._db)
        return groupwiki

class GroupWiki(models.Model):
    group_id = models.IntegerField(unique=True)
    repo_id = models.CharField(max_length=36)
    objects = GroupWikiManager()


class DuplicateWikiNameError(Exception):
    pass


class WikiManager(models.Manager):
    def add(self, wiki_name, username, permission='private', repo_id=None,
            org_id=-1):
        if not permission:
            permission = 'private'

        from .utils import slugfy_wiki_name
        slug = slugfy_wiki_name(wiki_name)
        if self.filter(slug=slug).count() > 0:
            raise DuplicateWikiNameError

        now = timezone.now()
        if repo_id is None:     # create new repo to store the wiki pages
            if org_id > 0:
                repo_id = seafile_api.create_org_repo(wiki_name, '', username,
                                                      passwd=None, org_id=org_id)
            else:
                repo_id = seafile_api.create_repo(wiki_name, '', username,
                                                  passwd=None)

        repo = seafile_api.get_repo(repo_id)
        assert repo is not None

        wiki = self.model(username=username, name=wiki_name, slug=slug,
                          repo_id=repo.id, permission=permission,
                          created_at=now)
        wiki.save(using=self._db)
        return wiki


class Wiki(models.Model):
    """New wiki model to enable a user has multiple wikis and replace
    personal wiki.
    """
    PERM_CHOICES = (
        ('private', 'private'),
        ('public', 'public'),
    )

    username = LowerCaseCharField(max_length=255)
    name = models.CharField(max_length=255)
    slug = models.CharField(max_length=255, unique=True)
    repo_id = models.CharField(max_length=36, db_index=True)
    permission = models.CharField(max_length=50)  # private, public
    created_at = models.DateTimeField(default=timezone.now, db_index=True)
    objects = WikiManager()

    class Meta:
        unique_together = (('username', 'repo_id'),)
        ordering = ["name"]

    @property
    def link(self):
        return get_site_scheme_and_netloc().rstrip('/') + reverse('wiki:slug',
                                                                  args=[self.slug])

    @property
    def updated_at(self):
        assert len(self.repo_id) == 36

        repo = seafile_api.get_repo(self.repo_id)
        if not repo:
            return ''

        return repo.last_modify

    def has_read_perm(self, request):
        from seahub.views import check_folder_permission
        if self.permission == 'public':
            return True
        else:   # private
            if not request.user.is_authenticated():
                return False
            repo_perm = check_folder_permission(request, self.repo_id, '/')
            if not repo_perm:
                return False
            return True

    def to_dict(self):
        return {
            'id': self.pk,
            'owner': self.username,
            'owner_nickname': email2nickname(self.username),
            'name': self.name,
            'slug': self.slug,
            'link': self.link,
            'permission': self.permission,
            'created_at': datetime_to_isoformat_timestr(self.created_at),
            'updated_at': timestamp_to_isoformat_timestr(self.updated_at),
        }


###### signal handlers
from django.dispatch import receiver
from seahub.signals import repo_deleted

@receiver(repo_deleted)
def remove_personal_wiki(sender, **kwargs):
    repo_owner = kwargs['repo_owner']
    repo_id = kwargs['repo_id']

    PersonalWiki.objects.filter(username=repo_owner, repo_id=repo_id).delete()
