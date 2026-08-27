import axios from 'axios';
import Cookies from 'js-cookie';
import { siteRoot } from './constants';

class ChatAPI {
  initForUsage({ siteRoot, xcsrfHeaders }) {
    const server = siteRoot && siteRoot.endsWith('/') ? siteRoot.slice(0, -1) : siteRoot;
    this.server = server;
    this.req = axios.create({
      headers: {
        'X-CSRFToken': xcsrfHeaders,
      }
    });
    return this;
  }

  _handleEventStreamRequest(url, form, options = {}) {
    let body = form;
    let headers = { ...options.headers };
    if (!headers['X-CSRFToken']) {
      const csrfToken = Cookies.get('sfcsrftoken');
      if (csrfToken) {
        headers['X-CSRFToken'] = csrfToken;
      }
    }
    if (!headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    if (!form) {
      return fetch(url, {
        method: 'GET',
        headers,
        credentials: 'include',
        signal: options.signal,
      });
    }

    if (form.getHeaders) {
      body = form;
      headers = { ...headers, ...form.getHeaders() };
    } else if (typeof form === 'object') {
      body = JSON.stringify(form);
    }

    return fetch(url, {
      method: 'POST',
      body,
      headers,
      credentials: 'include',
      signal: options.signal,
    });
  }

  sendChatMessageByStream(params, options = {}) {
    return this._handleEventStreamRequest(this.server + '/api/v2.1/ai/chat/', params, options);
  }

  getChatMessage(repoID, sessionId) {
    return this.req.get(this.server + '/api/v2.1/ai/chat/?session_uuid=' + sessionId);
  }

  listChatSessions(repoID) {
    return this.req.get(this.server + '/api/v2.1/ai/chat/sessions/?repo_id=' + repoID);
  }

  listTeamSharedSessions(repoID) {
    return this.req.get(this.server + '/api/v2.1/ai/chat/sessions/?repo_id=' + repoID + '&type=shared');
  }

  createChatSession(repoID, sessionName) {
    return this.req.post(this.server + '/api/v2.1/ai/chat/sessions/', {
      repo_id: repoID,
      session_name: sessionName,
    });
  }

  copyChatSession(sessionUUID) {
    return this.req.post(this.server + '/api/v2.1/ai/chat/sessions/' + sessionUUID + '/copy/');
  }

  shareChatSession(sessionUUID, isShared) {
    return this.req.put(this.server + '/api/v2.1/ai/chat/sessions/' + sessionUUID + '/', {
      is_shared: isShared,
    });
  }

  modifyChatSession(sessionUUID, update) {
    return this.req.put(this.server + '/api/v2.1/ai/chat/sessions/' + sessionUUID + '/', update);
  }

  deleteChatSession(sessionUUID) {
    return this.req.delete(this.server + '/api/v2.1/ai/chat/sessions/' + sessionUUID + '/');
  }

  getChatMessages(sessionUUID) {
    return this.req.get(this.server + '/api/v2.1/ai/chat/sessions/' + sessionUUID + '/messages/');
  }

  getMarkdownArtifact(fileUUID) {
    return this.req.get(this.server + '/api/v2.1/ai/chat/markdown-artifacts/' + fileUUID + '/');
  }

  createSdocReview(params) {
    return this.req.post(this.server + '/api/v2.1/ai/sdoc-reviews/', params);
  }

  getSdocReview(taskId) {
    return this.req.get(this.server + '/api/v2.1/ai/sdoc-reviews/' + taskId + '/');
  }

  cancelSdocReview(taskId) {
    return this.req.post(this.server + '/api/v2.1/ai/sdoc-reviews/' + taskId + '/cancel/');
  }

  approveSdocReview(taskId, selectedItemIds) {
    return this.req.post(this.server + '/api/v2.1/ai/sdoc-reviews/' + taskId + '/approve/', { selected_item_ids: selectedItemIds });
  }

  rejectSdocReview(taskId, selectedItemIds) {
    return this.req.post(this.server + '/api/v2.1/ai/sdoc-reviews/' + taskId + '/reject/', { selected_item_ids: selectedItemIds });
  }
}

const chatAPI = new ChatAPI();
chatAPI.initForUsage({
  siteRoot,
  xcsrfHeaders: Cookies.get('sfcsrftoken'),
});

export { chatAPI };
