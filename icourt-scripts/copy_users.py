import os

if not os.getenv('CCNET_CONF_DIR') or not os.getenv('SEAFILE_CONF_DIR'):
    print('Environment variable CCNET_CONF_DIR and SEAFILE_CONF_DIR must be set.\n')
    exit()

import seaserv
import sys
from sys import argv
from seaserv import seafile_api, seafserv_threaded_rpc

def main():
    if len(argv) < 3:
        print('Usage:\nCopy repos from user1(in org1) to user2(in org2):\n\tcopy.sh user1 user2 <org_id1> <org_id2>\n')
        return

    org_id1 = 0
    org_id2 = 0
    user1 = argv[1]
    user2 = argv[2]
    if len(argv) == 4:
        org_id1 = int(argv[3])
        org_id2 = org_id1
    elif len(argv) > 4:
        org_id1 = int(argv[3])
        org_id2 = int(argv[4])

    repos = None
    if org_id1 > 0:
        repos = seafile_api.get_org_owned_repo_list(org_id1, user1)
    else:
        repos = seafile_api.get_owned_repo_list (user1)

    if not repos:
        print('%s doesn\'t has any repos.' % user1)
        return

    for repo in repos:
        dst_repo_id = None
        if repo.encrypted:
            continue
        if org_id2 > 0:
            dst_repo_id = seafile_api.create_org_repo(repo.name, 'copy from repo:%.8s' % repo.id, user2, org_id2, None)
        else:
            dst_repo_id = seafile_api.create_repo(repo.name, 'copy from repo:%.8s' % repo.id, user2, None)
        if not dst_repo_id:
            print('Failed to create new repo, stop copy.')
            return

        filenames = ''
        dir_id = seafile_api.get_dir_id_by_path(repo.id, '/')
        if not dir_id:
            print('Failed to get dir_id for repo %s:%s.' % (repo.name, repo.id))
            continue
        dirs = seafserv_threaded_rpc.list_dir_with_perm(repo.id, '/', dir_id, user1, -1, -1)
        if not dirs:
            print('Failed to get dirs for repo %s:%s or repo is empty.' % (repo.name, repo.id))
            continue
        for dirent in dirs:
            filenames = filenames + dirent.obj_name + '\t'
        if not filenames:
            continue
        ret = seafile_api.copy_file(repo.id, '/', filenames.strip('\t'), dst_repo_id, 
                                    '/', filenames.strip('\t'), user2, 0, synchronous=1)
        if ret:
            print('Copy repo %s successfully!' % (repo.id))
            print('%s:%s' %(repo.id,dst_repo_id))
        else:
            print('Failed to copy repo %s.' % (repo_id))
            

if __name__ == '__main__':
    main()
