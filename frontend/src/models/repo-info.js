import { Utils } from '../utils/utils';

class RepoInfo {
  constructor(object) {
    this.repo_id = object.repo_id;
    this.repo_name = object.repo_name;
    this.permission = object.permission;
    this.size = Utils.bytesToSize(object.size);
    this.file_count = object.file_count;
    this.owner_name = object.owner_name;
    this.owner_email = object.owner_email;
    this.owner_contact_email = object.owner_contact_email;
    this.is_admin = object.is_admin;
    this.is_virtual = object.is_virtual;
    this.no_quota = object.no_quota;
    this.has_been_shared_out = object.has_been_shared_out;
    this.encrypted = object.encrypted;
  }
}

export default RepoInfo;
