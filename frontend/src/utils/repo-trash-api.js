import axios from 'axios';
import cookie from 'react-cookies';
import { siteRoot } from './constants';

class RepotrashAPI {

  init({ server, username, password, token }) {
    this.server = server;
    this.username = username;
    this.password = password;
    this.token = token;  //none
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

  getRepoFolderTrash2(repoID, path) {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/trash2/';
    let params = {
      path: path
    };
    return this.req.post(url, params);
  }

  deleteRepoTrash2(repoID, days) {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/trash2/';
    const params = {
      keep_days: days
    };
    return this.req.delete(url, {data: params});
  }


}

let repotrashAPI = new RepotrashAPI();
let xcsrfHeaders = cookie.load('sfcsrftoken');
repotrashAPI.initForSeahubUsage({ siteRoot, xcsrfHeaders });

export { repotrashAPI };
