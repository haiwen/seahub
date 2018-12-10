import { Utils } from '../utils/utils';

class RepoInfo {
  constructor(object) {
    this.repo_id = object.repo_id;
    this.repo_name = object.repo_name;
    this.permission = object.permission;
    this.size = Utils.bytesToSize(object.size);
    this.owner_name = object.owner_name;
    this.owner_email = object.owner_email;
    this.owner_contact_email = object.owner_contact_name;
    this.is_admin = object.is_admin;
    this.encrypted = object.encrypted;
    this.last_modified = object.last_modified;
    this.modifier_contact_email = object.modifier_contact_email;
    this.modifier_email = object.modifier_email;
    this.modifier_name = object.modifier_name;
    this.mtime = object.mtime;
  }
}

export default RepoInfo;

//todo rename to repo, and rename repo to repoInfo
