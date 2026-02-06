import { Utils } from '../utils/utils';

class Repo {
  constructor(object) {
    this.repo_id = object.repo_id;
    this.repo_name = object.repo_name;
    this.repo_type = object.repo_type;
    this.permission = object.permission;
    this.size_original = object.size;
    this.size = Utils.bytesToSize(object.size);

    // owner info
    this.owner_name = object.owner_name;
    this.owner_email = object.owner_email;
    this.owner_contact_email = object.owner_contact_email;
    this.owner_avatar = object.owner_avatar || '';

    this.encrypted = object.encrypted;

    // last_modified: last modified time
    this.last_modified = object.last_modified;
    this.modifier_contact_email = object.modifier_contact_email;
    this.modifier_email = object.modifier_email;
    this.modifier_name = object.modifier_name;
    this.modifier_avatar = object.modifier_avatar;
    this.enable_metadata = object.enable_metadata || false;

    this.type = object.type;
    this.starred = object.starred;
    this.monitored = object.monitored;
    this.status = object.status;
    this.storage_name = object.storage_name;
    this.archive_status = object.archive_status;
    if (object.is_admin != undefined) {
      this.is_admin = object.is_admin;
    }
    this.file_count = object.file_count || 0;
    this.has_been_shared_out = object.has_been_shared_out;
    this.is_virtual = object.is_virtual;
    this.lib_need_decrypt = object.lib_need_decrypt;
    this.no_quota = object.no_quota;
  }
}

export default Repo;
