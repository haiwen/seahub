import slugid from 'slugid';

class ChatMessage {
  constructor(object) {
    this._id = object.id || slugid.nice();
    this.message = object.message || {};
    this.isUserSpeak = object.isUserSpeak || false;
    this.type = object.type || '';
  }
}

export default ChatMessage;
