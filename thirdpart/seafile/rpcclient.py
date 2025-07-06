from pysearpc import searpc_func, SearpcError, NamedPipeClient, TcpClient, create_client
import platform

class SeafServerThreadedRpcClient(NamedPipeClient):
    """
    基于NamedPipe传输的Seafile RPC客户端（原始实现）
    """

    def __init__(self, pipe_path):
        NamedPipeClient.__init__(self, pipe_path, "seafserv-threaded-rpcserver")

    # repo manipulation
    @searpc_func("string", ["string", "string", "string", "string", "int", "string", "string"])
    def seafile_create_repo(name, desc, owner_email, passwd, enc_version, pwd_hash_algo, pwd_hash_params):
        pass
    create_repo = seafile_create_repo

    @searpc_func("string", ["string", "string", "string", "string", "string", "string", "string", "int", "string", "string", "string"])
    def seafile_create_enc_repo(repo_id, name, desc, owner_email, magic, random_key, salt, enc_version, pwd_hash, pwd_hash_algo, pwd_hash_params):
        pass
    create_enc_repo = seafile_create_enc_repo

    @searpc_func("objlist", ["string", "int", "int"])
    def seafile_get_repos_by_id_prefix(id_prefix, start, limit):
        pass
    get_repos_by_id_prefix = seafile_get_repos_by_id_prefix

    @searpc_func("object", ["string"])
    def seafile_get_repo(repo_id):
        pass
    get_repo = seafile_get_repo

    @searpc_func("int", ["string"])
    def seafile_destroy_repo(repo_id):
        pass
    remove_repo = seafile_destroy_repo

    @searpc_func("objlist", ["int", "int", "string", "int"])
    def seafile_get_repo_list(start, limit, order_by, ret_virt_repo):
        pass
    get_repo_list = seafile_get_repo_list

    @searpc_func("int64", [])
    def seafile_count_repos():
        pass
    count_repos = seafile_count_repos

    @searpc_func("int", ["string", "string", "string", "string"])
    def seafile_edit_repo(repo_id, name, description, user):
        pass
    edit_repo = seafile_edit_repo

    @searpc_func("int", ["string", "string"])
    def seafile_is_repo_owner(user_id, repo_id):
        pass
    is_repo_owner = seafile_is_repo_owner

    @searpc_func("int", ["string", "string"])
    def seafile_set_repo_owner(email, repo_id):
        pass
    set_repo_owner = seafile_set_repo_owner

    @searpc_func("string", ["string"])
    def seafile_get_repo_owner(repo_id):
        pass
    get_repo_owner = seafile_get_repo_owner

    @searpc_func("objlist", [])
    def seafile_get_orphan_repo_list():
        pass
    get_orphan_repo_list = seafile_get_orphan_repo_list

    @searpc_func("objlist", ["string", "int", "int", "int"])
    def seafile_list_owned_repos(user_id, ret_corrupted, start, limit):
        pass
    list_owned_repos = seafile_list_owned_repos

    @searpc_func("objlist", ["string"])
    def seafile_search_repos_by_name(name):
        pass
    search_repos_by_name = seafile_search_repos_by_name

    @searpc_func("int64", ["string"])
    def seafile_server_repo_size(repo_id):
        pass
    server_repo_size = seafile_server_repo_size

    @searpc_func("int", ["string", "string"])
    def seafile_repo_set_access_property(repo_id, role):
        pass
    repo_set_access_property = seafile_repo_set_access_property

    @searpc_func("string", ["string"])
    def seafile_repo_query_access_property(repo_id):
        pass
    repo_query_access_property = seafile_repo_query_access_property

    @searpc_func("int",  ["string", "string", "string"])
    def seafile_revert_on_server(repo_id, commit_id, user_name):
        pass
    revert_on_server = seafile_revert_on_server

    @searpc_func("objlist", ["string", "string", "string"])
    def seafile_diff():
        pass
    get_diff = seafile_diff

    @searpc_func("int", ["string", "string", "string", "string", "string"])
    def seafile_post_file(repo_id, tmp_file_path, parent_dir, filename, user):
        pass
    post_file = seafile_post_file

    @searpc_func("int", ["string", "string", "string", "string"])
    def seafile_post_dir(repo_id, parent_dir, new_dir_name, user):
        pass
    post_dir = seafile_post_dir

    @searpc_func("int", ["string", "string", "string", "string"])
    def seafile_post_empty_file(repo_id, parent_dir, filename, user):
        pass
    post_empty_file = seafile_post_empty_file

    @searpc_func("int", ["string", "string", "string", "string", "string", "string"])
    def seafile_put_file(repo_id, tmp_file_path, parent_dir, filename, user, head_id):
        pass
    put_file = seafile_put_file

    @searpc_func("int", ["string", "string", "string", "string"])
    def seafile_del_file(repo_id, parent_dir, filename, user):
        pass
    del_file = seafile_del_file

    @searpc_func("int", ["string", "string", "string"])
    def seafile_batch_del_files(repo_id, filepaths, user):
        pass
    batch_del_files = seafile_batch_del_files

    @searpc_func("object", ["string", "string", "string", "string", "string", "string", "string", "int", "int"])
    def seafile_copy_file(src_repo, src_dir, src_filename, dst_repo, dst_dir, dst_filename, user, need_progress, synchronous):
        pass
    copy_file = seafile_copy_file

    @searpc_func("object", ["string", "string", "string", "string", "string", "string", "int", "string", "int", "int"])
    def seafile_move_file(src_repo, src_dir, src_filename, dst_repo, dst_dir, dst_filename, replace, user, need_progress, synchronous):
        pass
    move_file = seafile_move_file

    @searpc_func("int", ["string", "string", "string", "string", "string"])
    def seafile_rename_file(repo_id, parent_dir, oldname, newname, user):
        pass
    rename_file = seafile_rename_file

    @searpc_func("int", ["string", "string"])
    def seafile_is_valid_filename(repo_id, filename):
        pass
    is_valid_filename = seafile_is_valid_filename

    @searpc_func("object", ["string", "int", "string"])
    def seafile_get_commit(repo_id, version, commit_id):
        pass
    get_commit = seafile_get_commit

    @searpc_func("string", ["string", "string", "int", "int"])
    def seafile_list_file_blocks(repo_id, file_id, offset, limit):
        pass
    list_file_blocks = seafile_list_file_blocks

    @searpc_func("objlist", ["string", "string", "int", "int"])
    def seafile_list_dir(repo_id, dir_id, offset, limit):
        pass
    list_dir = seafile_list_dir

    @searpc_func("objlist", ["string", "string", "sting", "string", "int", "int"])
    def list_dir_with_perm(repo_id, dir_path, dir_id, user, offset, limit):
        pass

    @searpc_func("int64", ["string", "int", "string"])
    def seafile_get_file_size(store_id, version, file_id):
        pass
    get_file_size = seafile_get_file_size

    @searpc_func("int64", ["string", "int", "string"])
    def seafile_get_dir_size(store_id, version, dir_id):
        pass
    get_dir_size = seafile_get_dir_size

    @searpc_func("objlist", ["string", "string", "string"])
    def seafile_list_dir_by_path(repo_id, commit_id, path):
        pass
    list_dir_by_path = seafile_list_dir_by_path

    @searpc_func("string", ["string", "string", "string"])
    def seafile_get_dir_id_by_commit_and_path(repo_id, commit_id, path):
        pass
    get_dir_id_by_commit_and_path = seafile_get_dir_id_by_commit_and_path

    @searpc_func("string", ["string", "string"])
    def seafile_get_file_id_by_path(repo_id, path):
        pass
    get_file_id_by_path = seafile_get_file_id_by_path

    @searpc_func("string", ["string", "string"])
    def seafile_get_dir_id_by_path(repo_id, path):
        pass
    get_dir_id_by_path = seafile_get_dir_id_by_path

    @searpc_func("string", ["string", "string", "string"])
    def seafile_get_file_id_by_commit_and_path(repo_id, commit_id, path):
        pass
    get_file_id_by_commit_and_path = seafile_get_file_id_by_commit_and_path

    @searpc_func("object", ["string", "string"])
    def seafile_get_dirent_by_path(repo_id, commit_id, path):
        pass
    get_dirent_by_path = seafile_get_dirent_by_path

    @searpc_func("objlist", ["string", "string", "string", "int"])
    def seafile_list_file_revisions(repo_id, commit_id, path, limit):
        pass
    list_file_revisions = seafile_list_file_revisions

    @searpc_func("objlist", ["string", "string"])
    def seafile_calc_files_last_modified(repo_id, parent_dir, limit):
        pass
    calc_files_last_modified = seafile_calc_files_last_modified

    @searpc_func("int", ["string", "string", "string", "string"])
    def seafile_revert_file(repo_id, commit_id, path, user):
        pass
    revert_file = seafile_revert_file

    @searpc_func("string", ["string", "string"])
    def seafile_check_repo_blocks_missing(repo_id, blklist):
        pass
    check_repo_blocks_missing = seafile_check_repo_blocks_missing

    @searpc_func("int", ["string", "string", "string", "string"])
    def seafile_revert_dir(repo_id, commit_id, path, user):
        pass
    revert_dir = seafile_revert_dir

    @searpc_func("objlist", ["string", "int", "string", "string", "int"])
    def get_deleted(repo_id, show_days, path, scan_stat, limit):
        pass

    # share repo to user
    @searpc_func("string", ["string", "string", "string", "string"])
    def seafile_add_share(repo_id, from_email, to_email, permission):
        pass
    add_share = seafile_add_share

    @searpc_func("objlist", ["string", "string", "int", "int"])
    def seafile_list_share_repos(email, query_col, start, limit):
        pass
    list_share_repos = seafile_list_share_repos

    @searpc_func("objlist", ["string", "string"])
    def seafile_list_repo_shared_to(from_user, repo_id):
        pass
    list_repo_shared_to = seafile_list_repo_shared_to

    @searpc_func("string", ["string", "string", "string", "string", "string", "string"])
    def share_subdir_to_user(repo_id, path, owner, share_user, permission, passwd):
        pass

    @searpc_func("int", ["string", "string", "string", "string"])
    def unshare_subdir_for_user(repo_id, path, owner, share_user):
        pass

    @searpc_func("int", ["string", "string", "string", "string", "string"])
    def update_share_subdir_perm_for_user(repo_id, path, owner, share_user, permission):
        pass

    @searpc_func("object", ["string", "string", "string", "int"])
    def get_shared_repo_by_path(repo_id, path, shared_to, is_org):
        pass

    @searpc_func("objlist", ["int", "string", "string", "int", "int"])
    def seafile_list_org_share_repos(org_id, email, query_col, start, limit):
        pass
    list_org_share_repos = seafile_list_org_share_repos

    @searpc_func("int", ["string", "string", "string"])
    def seafile_remove_share(repo_id, from_email, to_email):
        pass
    remove_share = seafile_remove_share

    @searpc_func("int", ["string", "string", "string", "string"])
    def set_share_permission(repo_id, from_email, to_email, permission):
        pass

    # share repo to group
    @searpc_func("int", ["string", "int", "string", "string"])
    def seafile_group_share_repo(repo_id, group_id, user_name, permisson):
        pass
    group_share_repo = seafile_group_share_repo

    @searpc_func("int", ["string", "int", "string"])
    def seafile_group_unshare_repo(repo_id, group_id, user_name):
        pass
    group_unshare_repo = seafile_group_unshare_repo

    @searpc_func("string", ["string"])
    def seafile_get_shared_groups_by_repo(repo_id):
        pass
    get_shared_groups_by_repo=seafile_get_shared_groups_by_repo

    @searpc_func("objlist", ["string", "string"])
    def seafile_list_repo_shared_group(from_user, repo_id):
        pass
    list_repo_shared_group = seafile_list_repo_shared_group

    @searpc_func("object", ["string", "string", "int", "int"])
    def get_group_shared_repo_by_path(repo_id, path, group_id, is_org):
        pass

    @searpc_func("objlist", ["string"])
    def get_group_repos_by_user (user):
        pass

    @searpc_func("objlist", ["string", "int"])
    def get_org_group_repos_by_user (user, org_id):
        pass

    @searpc_func("objlist", ["string", "string", "string"])
    def seafile_get_shared_users_for_subdir(repo_id, path, from_user):
        pass
    get_shared_users_for_subdir = seafile_get_shared_users_for_subdir

    @searpc_func("objlist", ["string", "string", "string"])
    def seafile_get_shared_groups_for_subdir(repo_id, path, from_user):
        pass
    get_shared_groups_for_subdir = seafile_get_shared_groups_for_subdir

    @searpc_func("string", ["string", "string", "string", "int", "string", "string"])
    def share_subdir_to_group(repo_id, path, owner, share_group, permission, passwd):
        pass

    @searpc_func("int", ["string", "string", "string", "int"])
    def unshare_subdir_for_group(repo_id, path, owner, share_group):
        pass

    @searpc_func("int", ["string", "string", "string", "int", "string"])
    def update_share_subdir_perm_for_group(repo_id, path, owner, share_group, permission):
        pass

    @searpc_func("string", ["int"])
    def seafile_get_group_repoids(group_id):
        pass
    get_group_repoids = seafile_get_group_repoids

    @searpc_func("objlist", ["int"])
    def seafile_get_repos_by_group(group_id):
        pass
    get_repos_by_group = seafile_get_repos_by_group

    @searpc_func("objlist", ["string"])
    def get_group_repos_by_owner(user_name):
        pass

    @searpc_func("string", ["string"])
    def get_group_repo_owner(repo_id):
        pass

    @searpc_func("int", ["int", "string"])
    def seafile_remove_repo_group(group_id, user_name):
        pass
    remove_repo_group = seafile_remove_repo_group

    @searpc_func("int", ["int", "string", "string"])
    def set_group_repo_permission(group_id, repo_id, permission):
        pass

    # branch and commit
    @searpc_func("objlist", ["string"])
    def seafile_branch_gets(repo_id):
        pass
    branch_gets = seafile_branch_gets

    @searpc_func("objlist", ["string", "int", "int"])
    def seafile_get_commit_list(repo_id, offset, limit):
        pass
    get_commit_list = seafile_get_commit_list


    ###### Token ####################

    @searpc_func("int", ["string", "string", "string"])
    def seafile_set_repo_token(repo_id, email, token):
        pass
    set_repo_token = seafile_set_repo_token

    @searpc_func("string", ["string", "string"])
    def seafile_get_repo_token_nonnull(repo_id, email):
        """Get the token of the repo for the email user. If the token does not
        exist, a new one is generated and returned.

        """
        pass
    get_repo_token_nonnull = seafile_get_repo_token_nonnull


    @searpc_func("string", ["string", "string"])
    def seafile_generate_repo_token(repo_id, email):
        pass
    generate_repo_token = seafile_generate_repo_token

    @searpc_func("int", ["string", "string"])
    def seafile_delete_repo_token(repo_id, token, user):
        pass
    delete_repo_token = seafile_delete_repo_token

    @searpc_func("objlist", ["string"])
    def seafile_list_repo_tokens(repo_id):
        pass
    list_repo_tokens = seafile_list_repo_tokens

    @searpc_func("objlist", ["string"])
    def seafile_list_repo_tokens_by_email(email):
        pass
    list_repo_tokens_by_email = seafile_list_repo_tokens_by_email

    @searpc_func("int", ["string", "string"])
    def seafile_delete_repo_tokens_by_peer_id(email, user_id):
        pass
    delete_repo_tokens_by_peer_id = seafile_delete_repo_tokens_by_peer_id

    @searpc_func("int", ["string"])
    def delete_repo_tokens_by_email(email):
        pass

    ###### quota ##########
    @searpc_func("int64", ["string"])
    def seafile_get_user_quota_usage(user_id):
        pass
    get_user_quota_usage = seafile_get_user_quota_usage

    @searpc_func("int64", ["string"])
    def seafile_get_user_share_usage(user_id):
        pass
    get_user_share_usage = seafile_get_user_share_usage

    @searpc_func("int64", ["int"])
    def seafile_get_org_quota_usage(org_id):
        pass
    get_org_quota_usage = seafile_get_org_quota_usage

    @searpc_func("int64", ["int", "string"])
    def seafile_get_org_user_quota_usage(org_id, user):
        pass
    get_org_user_quota_usage = seafile_get_org_user_quota_usage

    @searpc_func("int", ["string", "int64"])
    def set_user_quota(user, quota):
        pass

    @searpc_func("int64", ["string"])
    def get_user_quota(user):
        pass

    @searpc_func("int", ["int", "int64"])
    def set_org_quota(org_id, quota):
        pass

    @searpc_func("int64", ["int"])
    def get_org_quota(org_id):
        pass

    @searpc_func("int", ["int", "string", "int64"])
    def set_org_user_quota(org_id, user, quota):
        pass

    @searpc_func("int64", ["int", "string"])
    def get_org_user_quota(org_id, user):
        pass

    @searpc_func("int", ["string", "int64"])
    def check_quota(repo_id, delta):
        pass

    @searpc_func("objlist", [])
    def list_user_quota_usage():
        pass

    # password management
    @searpc_func("int", ["string", "string"])
    def seafile_check_passwd(repo_id, magic):
        pass
    check_passwd = seafile_check_passwd

    @searpc_func("int", ["string", "string", "string"])
    def seafile_set_passwd(repo_id, user, passwd):
        pass
    set_passwd = seafile_set_passwd

    @searpc_func("int", ["string", "string"])
    def seafile_unset_passwd(repo_id, user):
        pass
    unset_passwd = seafile_unset_passwd

    # repo permission checking
    @searpc_func("string", ["string", "string"])
    def check_permission(repo_id, user):
        pass

    # folder permission check
    @searpc_func("string", ["string", "string", "string"])
    def check_permission_by_path(repo_id, path, user):
        pass

    # org repo
    @searpc_func("string", ["string", "string", "string", "string", "string", "int", "int"])
    def seafile_create_org_repo(name, desc, user, passwd, magic, random_key, enc_version, org_id):
        pass
    create_org_repo = seafile_create_org_repo

    @searpc_func("int", ["string"])
    def seafile_get_org_id_by_repo_id(repo_id):
        pass
    get_org_id_by_repo_id = seafile_get_org_id_by_repo_id

    @searpc_func("objlist", ["int", "int", "int"])
    def seafile_get_org_repo_list(org_id, start, limit):
        pass
    get_org_repo_list = seafile_get_org_repo_list

    @searpc_func("int", ["int"])
    def seafile_remove_org_repo_by_org_id(org_id):
        pass
    remove_org_repo_by_org_id = seafile_remove_org_repo_by_org_id

    @searpc_func("objlist", ["int", "string"])
    def list_org_repos_by_owner(org_id, user):
        pass

    @searpc_func("string", ["string"])
    def get_org_repo_owner(repo_id):
        pass

    # org group repo
    @searpc_func("int", ["string", "int", "int", "string", "string"])
    def add_org_group_repo(repo_id, org_id, group_id, owner, permission):
        pass

    @searpc_func("int", ["string", "int", "int"])
    def del_org_group_repo(repo_id, org_id, group_id):
        pass

    @searpc_func("string", ["int", "int"])
    def get_org_group_repoids(org_id, group_id):
        pass

    @searpc_func("string", ["int", "int", "string"])
    def get_org_group_repo_owner(org_id, group_id, repo_id):
        pass

    @searpc_func("objlist", ["int", "string"])
    def get_org_group_repos_by_owner(org_id, user):
        pass

    @searpc_func("string", ["int", "string"])
    def get_org_groups_by_repo(org_id, repo_id):
        pass

    @searpc_func("int", ["int", "int", "string", "string"])
    def set_org_group_repo_permission(org_id, group_id, repo_id, permission):
        pass

    # inner pub repo
    @searpc_func("int", ["string", "string"])
    def set_inner_pub_repo(repo_id, permission):
        pass

    @searpc_func("int", ["string"])
    def unset_inner_pub_repo(repo_id):
        pass

    @searpc_func("objlist", [])
    def list_inner_pub_repos():
        pass

    @searpc_func("objlist", ["string"])
    def list_inner_pub_repos_by_owner(user):
        pass

    @searpc_func("int64", [])
    def count_inner_pub_repos():
        pass

    @searpc_func("int", ["string"])
    def is_inner_pub_repo(repo_id):
        pass

    # org inner pub repo
    @searpc_func("int", ["int", "string", "string"])
    def set_org_inner_pub_repo(org_id, repo_id, permission):
        pass

    @searpc_func("int", ["int", "string"])
    def unset_org_inner_pub_repo(org_id, repo_id):
        pass

    @searpc_func("objlist", ["int"])
    def list_org_inner_pub_repos(org_id):
        pass

    @searpc_func("objlist", ["int", "string"])
    def list_org_inner_pub_repos_by_owner(org_id, user):
        pass

    @searpc_func("int", ["string", "int"])
    def set_repo_history_limit(repo_id, days):
        pass

    @searpc_func("int", ["string"])
    def get_repo_history_limit(repo_id):
        pass

    @searpc_func("int", ["string", "int64"])
    def set_repo_valid_since(repo_id, timestamp):
        pass

    # virtual repo
    @searpc_func("string", ["string", "string", "string", "string", "string", "string"])
    def create_virtual_repo(origin_repo_id, path, repo_name, repo_desc, owner, passwd=''):
        pass

    @searpc_func("objlist", ["string"])
    def get_virtual_repos_by_owner(owner):
        pass

    @searpc_func("object", ["string", "string", "string"])
    def get_virtual_repo(origin_repo, path, owner):
        pass

    # system default library
    @searpc_func("string", [])
    def get_system_default_repo_id():
        pass

    # Change password
    @searpc_func("int", ["string", "string", "string", "string"])
    def seafile_change_repo_passwd(repo_id, old_passwd, new_passwd, user):
        pass
    change_repo_passwd = seafile_change_repo_passwd

    # Clean trash
    @searpc_func("int", ["string", "int"])
    def clean_up_repo_history(repo_id, keep_days):
        pass

    # Trashed repos
    @searpc_func("objlist", ["int", "int"])
    def get_trash_repo_list(start, limit):
        pass

    @searpc_func("int", ["string"])
    def del_repo_from_trash(repo_id):
        pass

    @searpc_func("int", ["string"])
    def restore_repo_from_trash(repo_id):
        pass

    @searpc_func("objlist", ["string"])
    def get_trash_repos_by_owner(owner):
        pass

    @searpc_func("int", [])
    def empty_repo_trash():
        pass

    @searpc_func("int", ["string"])
    def empty_repo_trash_by_owner(owner):
        pass

    @searpc_func("object", ["string"])
    def empty_repo_trash_by_owner(owner):
        pass

    @searpc_func("object", ["int", "string", "string"])
    def generate_magic_and_random_key(enc_version, repo_id, password):
        pass

    @searpc_func("int64", [])
    def get_total_file_number():
        pass

    @searpc_func("int64", [])
    def get_total_storage():
        pass

    @searpc_func("object", ["string", "string"])
    def get_file_count_info_by_path(repo_id, path):
        pass

    @searpc_func("string", ["string"])
    def get_trash_repo_owner(repo_id):
        pass

    @searpc_func("int64", ["string", "string"])
    def seafile_get_upload_tmp_file_offset(repo_id, file_path):
        pass
    get_upload_tmp_file_offset = seafile_get_upload_tmp_file_offset

    @searpc_func("int", ["string", "string", "string", "string"])
    def seafile_mkdir_with_parents (repo_id, parent_dir, relative_path, username):
        pass
    mkdir_with_parents = seafile_mkdir_with_parents

    @searpc_func("int", ["string", "string"])
    def get_server_config_int (group, key):
        pass

    @searpc_func("int", ["string", "string", "int"])
    def set_server_config_int (group, key, value):
        pass

    @searpc_func("int64", ["string", "string"])
    def get_server_config_int64 (group, key):
        pass

    @searpc_func("int", ["string", "string", "int64"])
    def set_server_config_int64 (group, key, value):
        pass

    @searpc_func("string", ["string", "string"])
    def get_server_config_string (group, key):
        pass

    @searpc_func("int", ["string", "string", "string"])
    def set_server_config_string (group, key, value):
        pass

    @searpc_func("int", ["string", "string"])
    def get_server_config_boolean (group, key):
        pass

    @searpc_func("int", ["string", "string", "int"])
    def set_server_config_boolean (group, key, value):
        pass

    @searpc_func("int", ["string", "int"])
    def repo_has_been_shared (repo_id, including_groups):
        pass

    @searpc_func("objlist", ["string"])
    def get_shared_users_by_repo (repo_id):
        pass

    @searpc_func("objlist", ["int", "string"])
    def org_get_shared_users_by_repo (org_id, repo_id):
        pass

    @searpc_func("string", ["string", "string", "string", "int"])
    def convert_repo_path(repo_id, path, user, is_org):
        pass

    # repo status
    @searpc_func("int", ["string", "int"])
    def set_repo_status(repo_id, status):
        pass

    @searpc_func("int", ["string"])
    def get_repo_status(repo_id):
        pass

    # token for web access to repo
    @searpc_func("string", ["string", "string", "string", "string", "int"])
    def seafile_web_get_access_token(repo_id, obj_id, op, username, use_onetime=1):
        pass
    web_get_access_token = seafile_web_get_access_token

    @searpc_func("object", ["string"])
    def seafile_web_query_access_token(token):
        pass
    web_query_access_token = seafile_web_query_access_token

    @searpc_func("string", ["string"])
    def seafile_query_zip_progress(token):
        pass
    query_zip_progress = seafile_query_zip_progress

    @searpc_func("int", ["string"])
    def cancel_zip_task(token):
        pass

    ###### GC    ####################
    @searpc_func("int", [])
    def seafile_gc():
        pass
    gc = seafile_gc

    @searpc_func("int", [])
    def seafile_gc_get_progress():
        pass
    gc_get_progress = seafile_gc_get_progress

    # password management
    @searpc_func("int", ["string", "string"])
    def seafile_is_passwd_set(repo_id, user):
        pass
    is_passwd_set = seafile_is_passwd_set

    @searpc_func("object", ["string", "string"])
    def seafile_get_decrypt_key(repo_id, user):
        pass
    get_decrypt_key = seafile_get_decrypt_key

    # Copy tasks

    @searpc_func("object", ["string"])
    def get_copy_task(task_id):
        pass

    @searpc_func("int", ["string"])
    def cancel_copy_task(task_id):
        pass

    # event
    @searpc_func("int", ["string", "string"])
    def publish_event(channel, content):
        pass

    @searpc_func("json", ["string"])
    def pop_event(channel):
        pass

    @searpc_func("objlist", ["string", "string"])
    def search_files(self, repo_id, search_str):
        pass

    @searpc_func("objlist", ["string", "string", "string"])
    def search_files_by_path(self, repo_id, path, search_str):
        pass

    #user management
    @searpc_func("int", ["string", "string", "int", "int"])
    def add_emailuser(self, email, passwd, is_staff, is_active):
        pass

    @searpc_func("int", ["string", "string"])
    def remove_emailuser(self, source, email):
        pass

    @searpc_func("int", ["string", "string"])
    def validate_emailuser(self, email, passwd):
        pass

    @searpc_func("object", ["string"])
    def get_emailuser(self, email):
        pass

    @searpc_func("object", ["string"])
    def get_emailuser_with_import(self, email):
        pass

    @searpc_func("object", ["int"])
    def get_emailuser_by_id(self, user_id):
        pass

    @searpc_func("objlist", ["string", "int", "int", "string"])
    def get_emailusers(self, source, start, limit, status):
        pass

    @searpc_func("objlist", ["string", "string", "int", "int"])
    def search_emailusers(self, source, email_patt, start, limit):
        pass

    @searpc_func("objlist", ["string", "int", "int"])
    def search_ldapusers(self, keyword, start, limit):
        pass

    @searpc_func("int64", ["string"])
    def count_emailusers(self, source):
        pass

    @searpc_func("int64", ["string"])
    def count_inactive_emailusers(self, source):
        pass

    @searpc_func("objlist", ["string"])
    def filter_emailusers_by_emails(self):
        pass
    
    @searpc_func("int", ["string", "int", "string", "int", "int"])
    def update_emailuser(self, source, user_id, password, is_staff, is_active):
        pass

    @searpc_func("int", ["string", "string"])
    def update_role_emailuser(self, email, role):
        pass

    @searpc_func("objlist", [])
    def get_superusers(self):
        pass

    @searpc_func("objlist", ["string", "string"])
    def get_emailusers_in_list(self, source, user_list):
        pass

    @searpc_func("int", ["string", "string"])
    def update_emailuser_id (self, old_email, new_email):
        pass

    #group management
    @searpc_func("int", ["string", "string", "string", "int"])
    def create_group(self, group_name, user_name, gtype, parent_group_id):
        pass

    @searpc_func("int", ["int", "string", "string", "int"])
    def create_org_group(self, org_id, group_name, user_name, parent_group_id):
        pass

    @searpc_func("int", ["int"])
    def remove_group(self, group_id):
        pass

    @searpc_func("int", ["int", "string", "string"])
    def group_add_member(self, group_id, user_name, member_name):
        pass

    @searpc_func("int", ["int", "string", "string"])
    def group_remove_member(self, group_id, user_name, member_name):
        pass

    @searpc_func("int", ["int", "string"])
    def group_set_admin(self, group_id, member_name):
        pass

    @searpc_func("int", ["int", "string"])
    def group_unset_admin(self, group_id, member_name):
        pass

    @searpc_func("int", ["int", "string"])
    def set_group_name(self, group_id, group_name):
        pass

    @searpc_func("int", ["int", "string"])
    def quit_group(self, group_id, user_name):
        pass

    @searpc_func("objlist", ["string", "int"])
    def get_groups(self, user_name, return_ancestors):
        pass

    @searpc_func("objlist", [])
    def list_all_departments(self):
        pass

    @searpc_func("objlist", ["int", "int", "string"])
    def get_all_groups(self, start, limit, source):
        pass

    @searpc_func("objlist", ["int"])
    def get_ancestor_groups(self, group_id):
        pass

    @searpc_func("objlist", ["int"])
    def get_top_groups(self, including_org):
        pass

    @searpc_func("objlist", ["int"])
    def get_child_groups(self, group_id):
        pass

    @searpc_func("objlist", ["int"])
    def get_descendants_groups(self, group_id):
        pass

    @searpc_func("object", ["int"])
    def get_group(self, group_id):
        pass

    @searpc_func("objlist", ["int"])
    def get_group_members(self, group_id):
        pass

    @searpc_func("objlist", ["int", "string"])
    def get_members_with_prefix(self, group_id, prefix):
        pass

    @searpc_func("int", ["int", "string", "int"])
    def check_group_staff(self, group_id, username, in_structure):
        pass

    @searpc_func("int", ["string"])
    def remove_group_user(self, username):
        pass

    @searpc_func("int", ["int", "string", "int"])
    def is_group_user(self, group_id, user, in_structure):
        pass

    @searpc_func("int", ["int", "string"])
    def set_group_creator(self, group_id, user_name):
        pass

    @searpc_func("objlist", ["string", "int", "int"])
    def search_groups(self, group_patt, start, limit):
        pass

    @searpc_func("objlist", ["int", "string"])
    def search_group_members(self, group_id, pattern):
        pass

    @searpc_func("objlist", ["string"])
    def get_groups_members(self, group_ids):
        pass
    #org management
    @searpc_func("int", ["string", "string", "string"])
    def create_org(self, org_name, url_prefix, creator):
        pass

    @searpc_func("int", ["int"])
    def remove_org(self, org_id):
        pass

    @searpc_func("objlist", ["int", "int"])
    def get_all_orgs(self, start, limit):
        pass

    @searpc_func("int64", [])
    def count_orgs(self):
        pass

    @searpc_func("object", ["string"])
    def get_org_by_url_prefix(self, url_prefix):
        pass

    @searpc_func("object", ["string"])
    def get_org_by_id(self, org_id):
        pass

    @searpc_func("int", ["int", "string", "int"])
    def add_org_user(self, org_id, email, is_staff):
        pass

    @searpc_func("int", ["int", "string"])
    def remove_org_user(self, org_id, email):
        pass

    @searpc_func("objlist", ["string"])
    def get_orgs_by_user(self, email):
        pass

    @searpc_func("objlist", ["string", "int", "int"])
    def get_org_emailusers(self, url_prefix, start, limit):
        pass

    @searpc_func("int", ["int", "int"])
    def add_org_group(self, org_id, group_id):
        pass

    @searpc_func("int", ["int", "int"])
    def remove_org_group(self, org_id, group_id):
        pass

    @searpc_func("int", ["int"])
    def is_org_group(self, group_id):
        pass

    @searpc_func("int", ["int"])
    def get_org_id_by_group(self, group_id):
        pass

    @searpc_func("objlist", ["int", "int", "int"])
    def get_org_groups(self, org_id, start, limit):
        pass

    @searpc_func("objlist", ["string", "int"])
    def get_org_groups_by_user (self, user, org_id):
        pass

    @searpc_func("objlist", ["int"])
    def get_org_top_groups(self, org_id):
        pass

    @searpc_func("int", ["int", "string"])
    def org_user_exists(self, org_id, email):
        pass

    @searpc_func("int", ["int", "string"])
    def is_org_staff(self, org_id, user):
        pass

    @searpc_func("int", ["int", "string"])
    def set_org_staff(self, org_id, user):
        pass

    @searpc_func("int", ["int", "string"])
    def unset_org_staff(self, org_id, user):
        pass

    @searpc_func("int", ["int", "string"])
    def set_org_name(self, org_id, org_name):
        pass

    @searpc_func("int", ["string", "string"])
    def set_reference_id(self, primary_id, reference_id):
        pass

    @searpc_func("string", ["string"])
    def get_primary_id(self, email):
        pass


def copy_rpc_methods(source_class):
    """
    类装饰器：自动复制源类中的所有RPC方法到目标类
    """
    def decorator(target_class):
        # 复制所有RPC方法
        for attr_name in dir(source_class):
            if not attr_name.startswith('_'):
                attr = getattr(source_class, attr_name)
                if callable(attr) and hasattr(attr, 'ret_type') and hasattr(attr, 'arg_types'):
                    # 这是一个RPC方法，复制到目标类
                    setattr(target_class, attr_name, attr)
        return target_class
    return decorator


@copy_rpc_methods(SeafServerThreadedRpcClient)
class SeafServerThreadedTcpRpcClient(TcpClient):
    """
    基于TCP传输的Seafile RPC客户端
    通过类装饰器自动复制SeafServerThreadedRpcClient的所有RPC方法
    """
    
    def __init__(self, host, port, pool_size=5):
        TcpClient.__init__(self, host, port, "seafserv-threaded-rpcserver", pool_size)


def create_seafile_rpc_client(socket_path=None, host=None, port=None, pool_size=5):
    """
    创建Seafile RPC客户端的工厂函数
    
    Args:
        socket_path: Unix socket路径（用于NamedPipe方式）
        host: TCP主机地址（用于TCP方式）
        port: TCP端口（用于TCP方式）
        pool_size: 连接池大小
        
    Returns:
        SeafServerThreadedRpcClient实例（NamedPipe或TCP版本）
    """
    # 如果明确指定了TCP参数，使用TCP版本
    if host is not None and port is not None:
        return SeafServerThreadedTcpRpcClient(host, port, pool_size)
    
    # 如果明确指定了socket路径，使用NamedPipe版本
    if socket_path is not None:
        return SeafServerThreadedRpcClient(socket_path)
    
    # 如果都没指定，根据平台选择默认方式
    if platform.system().lower() == 'windows':
        # Windows平台默认使用TCP（需要提供默认的host和port）
        import logging
        logger = logging.getLogger(__name__)
        logger.info('Windows平台检测到，默认使用TCP传输方式')
        # 这里使用默认值，实际使用时应该从配置中获取
        default_host = '127.0.0.1'
        default_port = 12001
        return SeafServerThreadedTcpRpcClient(default_host, default_port, pool_size)
    else:
        # 非Windows平台需要提供socket路径
        raise ValueError('socket_path必须为非Windows平台的named pipe传输提供')
