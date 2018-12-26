class SharedUploadInfo {
   
  constructor(object) {
    this.repo_id = object.repo_id;
    this.repo_name = object.repo_name;
    this.path = object.path;
    this.link = object.link;
    this.obj_name = object.obj_name;
    this.username = object.username;
    this.ctime = object.ctime;
    this.token = object.token;
    this.view_cnt = object.view_cnt;
  }

}


export default SharedUploadInfo;
