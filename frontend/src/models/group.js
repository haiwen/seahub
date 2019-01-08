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
  }
}

export default Group;
