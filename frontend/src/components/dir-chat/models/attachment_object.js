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
}

// The image payload is the stable part of the AI protocol: client side fields
// such as `_id`, the upload status, the local preview URL and the original File
// must not leave the frontend.
const toImagePayload = (attachment) => ({
  type: attachment.type,
  repo_id: attachment.repo_id,
  path: attachment.path,
  name: attachment.name,
});

// Images are keyed by a client side id that survives the upload, so the pending
// one can be replaced in place when the upload finishes or fails.
export const patchAttachmentById = (attachments, attachmentId, changes) => {
  return attachments.map((attachment) => (attachment._id === attachmentId
    ? new AttachmentObject({ ...attachment, ...changes })
    : attachment));
};

// Images that are still uploading or failed must not be sent to the AI.
// Attachments are normalized first so that plain objects (e.g. images restored
// from chat history, which carry no `status`) are treated as done.
// Only images are rewritten to the four field payload; other types keep their
// existing shape.
export const serializeAttachmentsForServer = (attachments = []) => {
  return attachments
    .map((attachment) => (attachment instanceof AttachmentObject ? attachment : new AttachmentObject(attachment)))
    .filter((attachment) => {
      return attachment.type !== CHAT_ATTACHMENT_TYPE.IMAGE || attachment.status === 'done';
    })
    .map((attachment) => {
      return attachment.type === CHAT_ATTACHMENT_TYPE.IMAGE ? toImagePayload(attachment) : attachment;
    });
};

export default AttachmentObject;
