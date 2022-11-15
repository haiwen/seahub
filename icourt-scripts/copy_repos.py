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
    repo_id = argv[1]
    newrepo_id = argv[2]
    user1 = argv[3]
    user2 = argv[4]
    
    filenames = ''
    dir_id = seafile_api.get_dir_id_by_path(repo_id, '/')
    if not dir_id:
        print('Failed to get dir_id for repo %s.' % (repo_id))
        return
    dirs = seafile_api.list_dir_with_perm(repo_id, '/', dir_id, user1, -1, -1)
    if not dirs:
        print('Failed to get dirs for repo %s or repo is empty.' % (repo_id))
        return
    for dirent in dirs:
        filenames = filenames + dirent.obj_name + '\t'
    if not filenames:
        return
    ret = seafile_api.copy_file(repo_id, '/', filenames.strip('\t'), newrepo_id,'/', filenames.strip('\t'), user2, False)
    if ret:
        print('Copy repo %s successfully!' % (repo_id))
    else:
        print('Failed to copy repo %s.' % (repo_id))
            

if __name__ == '__main__':
    main()
