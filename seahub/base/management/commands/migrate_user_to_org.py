from django.core.management.base import BaseCommand

from seaserv import ccnet_api
from seaserv import seafile_api

from seahub.utils.ccnet_db import CcnetDB
from seahub.utils.db_api import SeafileDB
from seahub.profile.models import Profile

ORG_ID = 1
SKIP_USERS = ['seafile2012@gmail.com',
              # seafile-ltd-org-admin@seafile.com
              'f8ea7b8af9704868a953e3ef401361d5@auth.local',
              # lian-test@seafile.com
              'dc96d8f94edc4d999a95beb026e43807@auth.local',
              # lian@seafile.com
              'ee8828625f8944a0ac7fabe5a1720ba9@auth.local']


class Command(BaseCommand):

    def handle(self, *args, **options):

        db_api = CcnetDB()
        users = ccnet_api.get_emailusers('DB', -1, -1)
        for user in users:
            ccnet_email = user.email
            print('\n')
            profile = Profile.objects.get_profile_by_user(ccnet_email)
            if ccnet_email in SKIP_USERS:
                print(f'skip {ccnet_email}, {profile.contact_email}')
                continue

            print(f'migrate {ccnet_email}, {profile.contact_email}')

            db_api.add_user_to_org(ccnet_email=ccnet_email, org_id=ORG_ID)
            print(f'add user {ccnet_email} to org')

            owned_repos = seafile_api.get_owned_repo_list(ccnet_email, ret_corrupted=True)
            owned_repo_ids = [item.repo_id for item in owned_repos]
            seafile_db = SeafileDB()
            seafile_db.add_repos_to_org_user(ORG_ID, ccnet_email, owned_repo_ids)
            print(f'add repos {owned_repo_ids} to org')
