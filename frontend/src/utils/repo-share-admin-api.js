import Cookies from 'js-cookie';
import { siteRoot } from './constants';
import axios from 'axios';

class RepoShareAdminAPI {
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

  listRepoShareLinks(repoID, page, perPage) {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/share-links/';
    const params = {
      page: page || 1,
      per_page: perPage || 25
    };
    return this.req.get(url, { params: params });
  }

  listRepoUploadLinks(repoID, page, perPage) {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/upload-links/';
    const params = {
      page: page || 1,
      per_page: perPage || 25
    };
    return this.req.get(url, { params: params });
  }

  deleteUploadLinks(tokens) {
    const url = this.server + '/api/v2.1/upload-links/';
    let param = { tokens: tokens };
    return this.req.delete(url, { data: param });
  }

}

let repoShareAdminAPI = new RepoShareAdminAPI();
let xcsrfHeaders = Cookies.get('sfcsrftoken');
repoShareAdminAPI.initForSeahubUsage({ siteRoot, xcsrfHeaders });
export { repoShareAdminAPI };
