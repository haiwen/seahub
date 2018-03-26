# Copyright (c) 2012-2016 Seafile Ltd.
# encoding: utf-8
import os
import logging

from django.core.management.base import BaseCommand

from seahub.wiki.models import PersonalWiki, Wiki, DuplicateWikiNameError

# Get an instance of a logger
logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Migrate records in wiki_personal_wiki table to wiki_wiki table.'
    label = "wiki_migrate_personal_wiki"

    def handle(self, *args, **options):
        print 'Start to migrate...'
        for r in PersonalWiki.objects.all():
            try:
                Wiki.objects.add(wiki_name=r.username.split('@')[0],
                                 username=r.username, repo_id=r.repo_id)
            except DuplicateWikiNameError:
                print 'Multiple personal wiki records found, user: %s, repo_id: %s. Skip.' % (r.username, r.repo_id)
                continue

        print 'Done.'
