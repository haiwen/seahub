class Dirent {
  constructor(json) {
    this.perm = json.perm;
    this.last_update = json.last_update;
    this.last_modified = json.last_modified;
    this.obj_name = json.obj_name;
    this.p_dpath = json.p_dpath;
    this.is_dir = json.is_dir ? json.is_dir : false;
    if (json.is_file) {
      this.is_file = json.is_file;
      this.is_locked = json.is_locked;
      this.obj_id = json.obj_id;
      this.file_size = json.file_size;
      this.starred = json.starred;
      this.lock_owner = json.lock_owner;
      this.lock_owner_name = json.lock_owner_name; 
    }
    if (json.is_img) {
      this.is_img = json.is_img;
      this.encoded_thumbnail_src = json.encoded_thumbnail_src;
    }
  }

  getPath() {
    return this.p_dpath;
  }

}

export default Dirent;
