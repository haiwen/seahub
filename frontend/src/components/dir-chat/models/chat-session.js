
class ChatSession {
  constructor(object) {
    this._id = object.session_uuid || '';
    this.username = object.username || '';
    this.name = object.session_name || '';
    this.created_at = object.created_at || '';
    this.updated_at = object.updated_at || '';
    this.is_shared = object.is_shared || false;

    this.is_replying = object.is_replying || false;
    this.running_task = object.running_task || false;
    this.problem = object.problem || null;
  }
}

export default ChatSession;
