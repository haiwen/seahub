class UploadLink {

  constructor(object) {
    this.repo_id = object.repo_id;
    this.repo_name = object.repo_name;
    this.path = object.path;
    this.link = object.link;
    this.obj_name = object.obj_name;
    this.obj_id = object.obj_id;
    this.username = object.username;
    this.ctime = object.ctime;
    this.token = object.token;
    this.view_cnt = object.view_cnt;
    this.expire_date = object.expire_date;
    this.is_expired = object.is_expired;
    this.password = object.password;
  }

}


export default UploadLink;
