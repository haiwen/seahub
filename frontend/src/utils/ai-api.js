import cookie from 'react-cookies';
import axios from 'axios';
import { siteRoot } from './constants';

class AIAPI {

  init({ server, username, password, token }) {
    this.server = server;
    this.username = username;
    this.password = password;
    this.token = token;
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
      var server = siteRoot.substring(0, siteRoot.length - 1);
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

  ocrRecognition = (repo_id, path) => {
    const url = this.server + '/api/v2.1/ai/ocr/';
    const data = {
      repo_id,
      path,
    };
    return this._sendPostRequest(url, data);
  };

}

let _AIAPI = new AIAPI();
let xcsrfHeaders = cookie.load('sfcsrftoken');
_AIAPI.initForSeahubUsage({ siteRoot, xcsrfHeaders });

export default _AIAPI;
