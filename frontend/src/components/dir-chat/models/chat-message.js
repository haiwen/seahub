import slugid from 'slugid';
import { CHAT_MESSAGE_TYPE } from '../constants';

class ChatMessage {
  static fromServer(item) {
    if (item.role === 'user') {
      return new ChatMessage({
        id: item.id,
        message: {
          [CHAT_MESSAGE_TYPE.TEXT]: item.content,
          [CHAT_MESSAGE_TYPE.ATTACHMENTS]: item.attachments || [],
        },
        isUserSpeak: true,
      });
    }
    return new ChatMessage({
      id: item.id,
      type: CHAT_MESSAGE_TYPE.GROUP,
      extensions: item.extensions || [],
      message: {
        [CHAT_MESSAGE_TYPE.AI_REPLY]: item.content || '',
        [CHAT_MESSAGE_TYPE.SOURCES]: Array.isArray(item.sources) ? item.sources : [],
        [CHAT_MESSAGE_TYPE.THOUGHT_PROCESS]: item.thought_process,
      },
    });
  }

  constructor(object) {
    this._id = object.id || slugid.nice();
    this.message = object.message || {};
    this.isUserSpeak = object.isUserSpeak || false;
    this.type = object.type || '';
    this.extensions = object.extensions || [];
  }
}

export default ChatMessage;
