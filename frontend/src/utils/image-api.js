import Cookies from 'js-cookie';
import axios from 'axios';
import { siteRoot } from './constants';

class ImageAPI {

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

  rotateImage(repoID, path, angle) {
    let url = `${this.server}/api/v2.1/repos/${repoID}/image-rotate/`;
    let form = new FormData();
    form.append('path', path);
    form.append('angle', angle);
    return this._sendPostRequest(url, form);
  }

}

let imageAPI = new ImageAPI();
let xcsrfHeaders = Cookies.get('sfcsrftoken');
imageAPI.initForSeahubUsage({ siteRoot, xcsrfHeaders });

export default imageAPI;
