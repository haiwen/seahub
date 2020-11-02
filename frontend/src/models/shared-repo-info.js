class SharedRepoInfo {

  constructor(object) {
    this.repo_id = object.repo_id;
    this.repo_name = object.repo_name;
    this.share_type = object.share_type;
    this.share_permission = object.share_permission;
    this.modifier_name = object.modifier_name;
    this.modifier_email = object.modifier_email;
    this.modifier_contact_email = object.modifier_contact_email;
    this.encrypted = object.encrypted;
    if (this.share_type === 'personal') {
      this.is_admin = object.is_admin;
      this.user_name = object.user_name;
      this.user_email = object.user_email;
      this.contact_email = object.contact_email;
    } else if (this.share_type === 'group') {
      this.is_admin = object.is_admin;
      this.group_id = object.group_id;
      this.group_name = object.group_name;
    }
  }

}

export default SharedRepoInfo;
