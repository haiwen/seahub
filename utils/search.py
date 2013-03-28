from django.conf import settings

from seahub.utils import get_user_repos, get_file_last_modified

if getattr(settings, 'ENABLE_FILE_SEARCH', False):
    from seafes import es_get_conn, es_search

    es_conn = None
    def search_file_by_name(request, keyword, start, size):
        owned_repos, shared_repos, groups_repos, pub_repo_list = get_user_repos(request.user)

        # unify the repo.owner property
        for repo in owned_repos:
            repo.owner = request.user.username
        for repo in shared_repos:
            repo.owner = repo.user
        for repo in pub_repo_list:
            repo.owner = repo.user

        pubrepo_id_map = {}
        for repo in pub_repo_list:
            # fix pub repo obj attr name mismatch in seafile/lib/repo.vala
            repo.id = repo.repo_id
            repo.name = repo.repo_name
            pubrepo_id_map[repo.id] = repo

        # remove duplicates from non-pub repos
        nonpub_repo_list = []
        for repo in owned_repos + shared_repos + groups_repos:
            if repo.id not in nonpub_repo_list:
                nonpub_repo_list.append(repo)

        nonpub_repo_ids = [ repo.id for repo in nonpub_repo_list ]

        global es_conn
        if es_conn is None:
            es_conn = es_get_conn()
        files_found, total = es_search(es_conn, nonpub_repo_ids, keyword, start, size)

        if len(files_found) > 0:
            # construt a (id, repo) hash table for fast lookup
            repo_id_map = {}
            for repo in nonpub_repo_list:
                repo_id_map[repo.id] = repo

            repo_id_map.update(pubrepo_id_map)

            for f in files_found:
                repo = repo_id_map.get(f['repo_id'].encode('UTF-8'), None)
                if repo:
                    f['repo'] = repo
                    f['exists'] = True
                    f['last_modified_by'], f['last_modified'] = get_file_last_modified(f['repo_id'], f['fullpath'])
                else:
                    f['exists'] = False

            files_found = filter(lambda f: f['exists'], files_found)

        return files_found, total
else:
    def search_file_by_name(*args):
        pass
