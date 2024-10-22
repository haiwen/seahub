# -*- coding: utf-8 -*-
import logging
from datetime import datetime

from django.core.management.base import BaseCommand
from seaserv import seafile_api, ccnet_api

from seahub.base.accounts import User
from seahub.share.models import UploadLinkShare, FileShare
from seahub.utils.db_api import SeafileDB

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Transfer a repo to a new owner'
    label = "repo_transfer"

    def add_arguments(self, parser):
        parser.add_argument('-r', '--repo_id', help='Repo ID')
        parser.add_argument('-o', '--new_owner', help='New owner of the repo')
    
    def handle(self, *args, **options):
        repo_id = options.get('repo_id')
        new_owner = options.get('new_owner')
        if not repo_id:
            self._pring_msg('repo_id is required', 'error')
            return
        if not new_owner:
            self._pring_msg('new_owner is required', 'error')
            return
        
        logger.debug('Start transfer_repos.')
        self.stdout.write('[%s] Start transfer repos.' % datetime.now())
        self.transfer_repo(repo_id, new_owner)
        self.stdout.write('[%s] Finish transfer repos.\n' % datetime.now())
        logger.debug('Finish transfer repos.\n')
        
    def _pring_msg(self, msg, msg_type='info'):
        self.stdout.write('[%s][%s] %s' % (datetime.now(),msg_type.upper(), msg))
        
    def _get_repo_owner(self, repo_id, org_id):
        if org_id:
            repo_owner = seafile_api.get_org_repo_owner(repo_id)
        else:
            repo_owner = seafile_api.get_repo_owner(repo_id)
            
        return repo_owner
    
    def is_dept(self, group):
        return group.creator_name == 'system admin'
    
    
    def transfer_repo(self, repo_id, new_owner, org_id=None):
        
        try:
            int(new_owner)
            new_owner = '%s@seafile_group' % new_owner
        except:
            pass
        
        # 1. check repo_owner
        repo_owner = self._get_repo_owner(repo_id, org_id)
        if repo_owner == new_owner:
            error_msg = 'Cannot transfer repo to its owner'
            self._pring_msg(error_msg, 'error')
            return
        
        group_id = None
        if '@seafile_group' in new_owner:
            group_id = int(new_owner.split('@')[0])
        
        # 2. transfer repo
        seafile_db_api = SeafileDB()
        if group_id:
            group = ccnet_api.get_group(int(group_id))
            
            if not group:
                error_msg = 'Group %s not found' % group_id
                self._pring_msg(error_msg, 'error')
                return
            
            if not self.is_dept(group):
                error_msg = 'Group %s is not a department' % group_id
                self._pring_msg(error_msg, 'error')
                return
    
            seafile_db_api.set_repo_group_owner(repo_id, group_id, org_id)
        else:
            try:
                User.objects.get(email=new_owner)
            except User.DoesNotExist:
                error_msg = 'User %s not found.' % new_owner
                self._pring_msg(error_msg, 'error')
                return
                
            seafile_db_api.set_repo_owner(repo_id, new_owner, org_id)
            
        # 3. update the share relations
        try:
            seafile_db_api.update_repo_user_shares(repo_id, new_owner, org_id)
            seafile_db_api.update_repo_group_shares(repo_id, new_owner, org_id)
            seafile_db_api.delete_repo_user_token(repo_id, repo_owner)

            UploadLinkShare.objects.filter(repo_id=repo_id).update(username=new_owner)
            FileShare.objects.filter(repo_id=repo_id).update(username=new_owner)
        except Exception as error_msg:
            self._pring_msg(error_msg, 'error')
