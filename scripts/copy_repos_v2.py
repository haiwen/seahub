import os
import json
from seaserv import seafile_api


if not os.getenv('CCNET_CONF_DIR') or not os.getenv('SEAFILE_CONF_DIR'):
    print('Environment variable CCNET_CONF_DIR and SEAFILE_CONF_DIR must be set.\n')
    exit()


FROM_USER = ''
FROM_REPO_ID = ''

TO_USER = ''
TO_REPO_ID = ''

# usage: ./seahub.sh python-env python3 copy_repos_v2.py


def main():

    dir_id = seafile_api.get_dir_id_by_path(FROM_REPO_ID, '/')
    if not dir_id:
        print('Failed to get dir_id for repo %s.' % (FROM_REPO_ID))
        return

    dirs = seafile_api.list_dir_with_perm(FROM_REPO_ID, '/', dir_id, FROM_USER, -1, -1)
    if not dirs:
        print('Failed to get dirs for repo %s or repo is empty.' % (FROM_REPO_ID))
        return

    from_filename_list = []
    for dirent in dirs:
        from_filename_list.append(dirent.obj_name)

    if not from_filename_list:
        return

    from_filename_json = json.dumps(from_filename_list)
    ret = seafile_api.copy_file(FROM_REPO_ID, '/', from_filename_json,
                                TO_REPO_ID, '/', from_filename_json,
                                FROM_USER, False)

    if ret:
        print('Copy repo %s successfully!' % (FROM_REPO_ID))
    else:
        print('Failed to copy repo %s.' % (FROM_REPO_ID))


if __name__ == '__main__':
    main()
