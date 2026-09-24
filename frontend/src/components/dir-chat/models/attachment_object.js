import { CHAT_ATTACHMENT_TYPE } from '../constants';

class AttachmentObject {
  constructor(object) {
    this.repo_id = object.repo_id || '';
    this.path = object.path || '';
    this.name = object.name || this.path.split('/').pop() || '';
    this.type = object.type || CHAT_ATTACHMENT_TYPE.FILE;
    this.content = object.content || '';

    if (this.type === CHAT_ATTACHMENT_TYPE.IMAGE) {
      // Images are keyed by a client side id: `path` is a local object URL while
      // uploading and becomes the library path once the upload finishes, so it
      // cannot be used as a stable key.
      this._id = object._id || `${this.repo_id}:${this.path}`;
      this.key = this._id;
      this.status = object.status || 'done'; // uploading / failed / done
      this.preview_path = object.preview_path || '';
      this.image = object.image || null; // original File, kept for retry
      return;
    }

    this.key = `${this.repo_id}:${this.path}`;
  }

  to_json() {
    if (this.type === CHAT_ATTACHMENT_TYPE.IMAGE) {
      return {
        type: this.type,
        repo_id: this.repo_id,
        path: this.path,
        name: this.name,
      };
    }

    return {
      repo_id: this.repo_id,
      path: this.path,
      name: this.name,
      type: this.type,
      content: this.content,
    };
  }
}

// Images that are still uploading or failed must not be sent to the AI.
// Attachments are normalized first so that plain objects (e.g. images restored
// from chat history, which carry no `status`) are treated as done.
// Only image attachments are serialized through `to_json()`; other types keep
// their existing payload shape.
export const serializeAttachmentsForServer = (attachments = []) => {
  return attachments
    .map((attachment) => (attachment instanceof AttachmentObject ? attachment : new AttachmentObject(attachment)))
    .filter((attachment) => {
      return attachment.type !== CHAT_ATTACHMENT_TYPE.IMAGE || attachment.status === 'done';
    })
    .map((attachment) => {
      return attachment.type === CHAT_ATTACHMENT_TYPE.IMAGE ? attachment.to_json() : attachment;
    });
};

export default AttachmentObject;
