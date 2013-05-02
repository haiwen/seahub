from django.db import models

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
    username = models.CharField(max_length=255, unique=True)
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

