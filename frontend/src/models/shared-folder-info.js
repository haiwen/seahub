class SharedFolderInfo {

  constructor(object) {
    this.path = object.path;
    this.folder_name = object.folder_name;
    this.repo_id = object.repo_id;
    this.repo_name = object.repo_name;
    this.share_type = object.share_type;
    this.share_permission = object.share_permission;
    if (object.share_type === 'group') {
      this.group_id = object.group_id;
      this.group_name = object.group_name;
    } else {
      this.user_name = object.user_name;
      this.user_email = object.user_email;
      this.contact_email = object.contact_email;
    }
  }

}

export default SharedFolderInfo;
