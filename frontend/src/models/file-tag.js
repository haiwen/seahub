class FileTag {
  constructor(object) {
    this.id = object.file_tag_id;
    this.repo_tag_id = object.repo_tag_id;
    this.name = object.tag_name;
    this.color = object.tag_color;
  }
}

export default FileTag;
