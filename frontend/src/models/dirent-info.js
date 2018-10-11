class DirentInfo {
  constructor({ 
    repo_name, 
    user_perm, 
    no_quota, 
    encrypted, 
    repo_owner, 
    is_repo_owner, 
    is_virtual, 
    has_been_shared_out,
    is_admin
  }) {
    this.repo_name = repo_name;
    this.user_perm = user_perm;
    this.no_quota = no_quota;
    this.encrypted = encrypted;
    this.repo_owner = repo_owner;
    this.is_repo_owner = is_repo_owner;
    this.is_virtual = is_virtual;
    this.has_been_shared_out = has_been_shared_out;
    this.is_admin = is_admin;
  }
}

export default DirentInfo;
