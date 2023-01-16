import { Utils } from '../utils/utils';

class Repo {
  constructor(object) {
    this.repo_id = object.repo_id;
    this.repo_name = object.repo_name;
    this.permission = object.permission;
    this.size_original = object.size;
    this.size = Utils.bytesToSize(object.size);
    this.owner_name = object.owner_name;
    this.owner_email = object.owner_email;
    this.owner_contact_email = object.owner_contact_email;
    this.encrypted = object.encrypted;
    this.last_modified = object.last_modified;
    this.modifier_contact_email = object.modifier_contact_email;
    this.modifier_email = object.modifier_email;
    this.modifier_name = object.modifier_name;
    this.type = object.type;
    this.starred = object.starred;
    this.monitored = object.monitored;
    this.status = object.status;
    this.storage_name = object.storage_name;
    if (object.is_admin != undefined) {
      this.is_admin = object.is_admin;
    }
  }
}

export default Repo;
