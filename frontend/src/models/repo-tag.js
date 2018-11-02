class RepoTag {
  constructor(object) {
    this.id = object.repo_tag_id;
    this.repo_id = object.repo_id;
    this.name = object.tag_name;
    this.color = object.tag_color;
  }
}

export default RepoTag;
