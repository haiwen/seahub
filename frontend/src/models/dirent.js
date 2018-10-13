class Dirent {
  constructor(json) {
    this.id = json.id;
    this.name = json.name;
    this.type = json.type;
    this.mtime = json.mtime;
    this.permission = json.permission;
    if (json.type === 'file') {
      this.size = json.size;
      this.starred = json.starred;
      this.is_locked = json.is_locked;
      this.lock_time = json.lock_time;
      this.lock_owner= json.lock_owner;
      this.locked_by_me = json.locked_by_me;
      this.modifier_name = json.modifier_name;
      this.modifier_email = json.modifier_email;
      this.modifier_contact_email = json.modifier_contact_email;
    }
  }

}

export default Dirent;
