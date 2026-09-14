class AttachmentObject {
  constructor(object) {
    this.repo_id = object.repo_id || '';
    this.path = object.path || '';
    this.name = object.name || this.path.split('/').pop() || '';
    this.type = object.type || 'file';
    this.content = object.content || '';
    this.key = `${this.repo_id}:${this.path}`;
  }
}

export default AttachmentObject;
