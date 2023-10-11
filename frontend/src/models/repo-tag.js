class RepoTag {
  constructor(object) {
    this.id = object.repo_tag_id;
    this.fileCount = object.files_count || 0;
    this.name = object.tag_name;
    this.color = object.tag_color;
  }
}

export default RepoTag;
