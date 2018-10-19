# Copyright (c) 2012-2016 Seafile Ltd.
# encoding: utf-8
from django.core.management.base import BaseCommand
from seaserv import seafile_api

from seahub.wiki.models import GroupWiki, Wiki, DuplicateWikiNameError


class Command(BaseCommand):
    help = 'Migrate records in wiki_group_wiki table to wiki_wiki table.'
    label = "wiki_migrate_group_wiki"

    def handle(self, *args, **options):
        print 'Start to migrate...'
        for r in GroupWiki.objects.all():
            repo = seafile_api.get_repo(r.repo_id)
            if not repo:
                print('Repo %s not found. Skip.' % r.repo_id)
                continue

            owner = seafile_api.get_repo_owner(r.repo_id)
            if not owner:
                print('Owner of repo %s not found. Skip.' % r.repo_id)
                continue

            wiki_name = 'Group%s-%s' % (r.group_id, repo.name)
            try:
                Wiki.objects.add(wiki_name=wiki_name,
                                 username=owner, repo_id=r.repo_id)
                print('Successfully migrated GroupWiki(%s-%s) to Wiki(%s-%s-%s)' % (r.group_id, r.repo_id, owner, wiki_name, r.repo_id))
            except DuplicateWikiNameError:
                print 'Multiple group wiki records found, group: %s, repo_id: %s. Skip.' % (r.group_id, r.repo_id)
                continue
            except Exception as e:
                print e
                continue

        print 'Done.'
