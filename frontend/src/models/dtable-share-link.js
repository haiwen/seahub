class DTableShareLink {

  constructor(object) {
    this.workspaceID = object.workspace_id;
    this.permissions = object.permission;
    this.username = object.username;
    this.is_expired = object.is_expired;
    this.expire_date = object.expire_date;
    this.token = object.token;
    this.link = object.link;
    this.ctime = object.ctime;
  }

}

export default DTableShareLink;
