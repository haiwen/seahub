class SharedLinkInfo {

  constructor(object) {
    this.repo_id = object.repo_id;
    this.repo_name = object.repo_name;
    this.path = object.path;
    this.obj_name = object.obj_name;
    this.is_dir = object.is_dir;
    this.permissions = object.permissions;
    this.username = object.username;
    this.is_expired = object.is_expired;
    this.expire_date = object.expire_date;
    this.token = object.token;
    this.link = object.link;
    this.view_cnt = object.view_cnt;
    this.ctime = object.ctime;
  }

}

export default SharedLinkInfo;
