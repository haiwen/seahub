import Cookies from 'js-cookie';
import { siteRoot } from './constants';
import axios from 'axios';

class ShareLinkAPI {
  init({ server, username, password, token }) {
    this.server = server;
    this.username = username;
    this.password = password;
    this.token = token; // none
    if (this.token && this.server) {
      this.req = axios.create({
        baseURL: this.server,
        headers: { 'Authorization': 'Token ' + this.token },
      });
    }
    return this;
  }

  initForSeahubUsage({ siteRoot, xcsrfHeaders }) {
    if (siteRoot && siteRoot.charAt(siteRoot.length - 1) === '/') {
      let server = siteRoot.substring(0, siteRoot.length - 1);
      this.server = server;
    } else {
      this.server = siteRoot;
    }
    this.req = axios.create({
      headers: {
        'X-CSRFToken': xcsrfHeaders,
      }
    });
    return this;
  }

  _sendPostRequest(url, form) {
    if (form.getHeaders) {
      return this.req.post(url, form, {
        headers: form.getHeaders()
      });
    } else {
      return this.req.post(url, form);
    }
  }

  listShareLinkAuthUsers(link_token, path) {
    const url = this.server + '/api/v2.1/share-links/' + link_token + '/user-auth/?path=' + encodeURIComponent(path);
    return this.req.get(url);
  }

  addShareLinkAuthUsers(link_token, emails, path) {
    const url = this.server + '/api/v2.1/share-links/' + link_token + '/user-auth/?path=' + encodeURIComponent(path);
    const data = {
      emails: emails,
    };
    return this.req.post(url, data);

  }

  deleteShareLinkAuthUsers(link_token, emails, path) {
    const url = this.server + '/api/v2.1/share-links/' + link_token + '/user-auth/?path=' + encodeURIComponent(path);
    const params = {
      emails: emails,
    };
    return this.req.delete(url, { data: params });
  }

  listShareLinkAuthEmails(link_token, path) {
    const url = this.server + '/api/v2.1/share-links/' + link_token + '/email-auth/?path=' + encodeURIComponent(path);
    return this.req.get(url);
  }

  addShareLinkAuthEmails(link_token, emails, path) {
    const url = this.server + '/api/v2.1/share-links/' + link_token + '/email-auth/?path=' + encodeURIComponent(path);
    const data = {
      emails: emails,
    };
    return this.req.post(url, data);

  }

  deleteShareLinkAuthEmails(link_token, emails, path) {
    const url = this.server + '/api/v2.1/share-links/' + link_token + '/email-auth/?path=' + encodeURIComponent(path);
    const params = {
      emails: emails,
    };
    return this.req.delete(url, { data: params });
  }

  updateShareLink(token, permissions, expirationTime = '', userScope = '') {
    var url = this.server + '/api/v2.1/share-links/' + token + '/';
    let form = new FormData();
    if (permissions) {
      form.append('permissions', permissions);
    }
    if (expirationTime) {
      form.append('expiration_time', expirationTime);
    }
    if (userScope) {
      form.append('user_scope', userScope);
    }
    return this.req.put(url, form);
  }

  createMultiShareLink(repoID, path, password, expirationTime, permissions, scope, users, comment) {
    const url = this.server + '/api/v2.1/multi-share-links/';
    let form = {
      'path': path,
      'repo_id': repoID,
      'user_scope': scope,
      'comment': comment
    };
    if (permissions) {
      form['permissions'] = permissions;
    }
    if (password) {
      form['password'] = password;
    }
    if (expirationTime) {
      form['expiration_time'] = expirationTime;
    }
    if (users) {
      form['emails'] = users;
    }
    return this._sendPostRequest(url, form);
  }
}

let shareLinkAPI = new ShareLinkAPI();
let xcsrfHeaders = Cookies.get('sfcsrftoken');
shareLinkAPI.initForSeahubUsage({ siteRoot, xcsrfHeaders });
export { shareLinkAPI };
