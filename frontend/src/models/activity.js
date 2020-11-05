class Acticity {
  constructor(json) {
    this.repo_id = json.repo_id;
    this.repo_name = json.repo_name;
    this.obj_type = json.obj_type;
    this.commit_id = json.commit_id;
    this.path = json.path;
    this.name = json.name;
    this.author_email = json.author_email;
    this.author_name = json.author_name;
    this.author_contact_email = json.author_contact_email;
    this.avatar_url = json.avatar_url;
    this.time = json.time;
    this.op_type = json.op_type;
    this.createdFilesCount = 0;
    this.createdFilesList = [];
    if (json.op_type === 'clean-up-trash') {
      this.days = json.days;
    } else if (json.op_type === 'rename' && json.obj_type === 'repo') {
      this.old_repo_name = json.old_repo_name;
    } else if (json.op_type === 'move' && ['dir', 'file'].includes(json.obj_type)) {
      this.old_path = json.old_path;
    } else if (json.op_type === 'rename' && ['dir', 'file'].includes(json.obj_type)) {
      this.old_path = json.old_path;
      this.old_name = json.old_name;
    } else if (json.op_type === 'publish') {
      this.old_path = json.old_path;
    } else if (json.name.endsWith('(draft).md')) {
      this.draft_id = json.draft_id;
    }
  }
}

export default Acticity;
