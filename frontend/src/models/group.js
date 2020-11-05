class Group {
  constructor(object) {
    this.id= object.id;
    this.name = object.name;
    this.owner = object.owner;
    this.admins = object.admins || [];
    this.avatar_url = object.avatar_url;
    this.created_at = object.created_at;
    this.parent_group_id = object.parent_group_id;
    this.wiki_enabled = object.wiki_enabled;
    this.repos = object.repos || [];
    this.group_quota = object.group_quota;
    this.group_quota_usage = object.group_quota_usage;
  }
}

export default Group;
