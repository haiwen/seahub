from seaserv import seafile_api, get_org_id_by_repo_id

repo_org = {}
is_org = -1


def get_org_id(repo_id):
    global is_org
    if is_org == -1:
        org_conf = seafile_api.get_server_config_string('general', 'multi_tenancy')
        if not org_conf:
            is_org = 0
        elif org_conf.lower() == 'true':
            is_org = 1
        else:
            is_org = 0

    if not is_org:
        return -1

    if repo_id not in repo_org:
        repo_org[repo_id] = get_org_id_by_repo_id(repo_id)

    return repo_org[repo_id]
