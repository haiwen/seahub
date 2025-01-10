import axios from 'axios';
import cookie from 'react-cookies';
import { siteRoot } from './constants';

class UserAPI {

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

  getOfficeSuite(repoID) {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/office-suite/';
    return this.req.get(url);
  }

  setOfficeSuite(repoID, suiteID) {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/office-suite/';
    const form = new FormData();
    form.append('suite_id', suiteID);
    return this.req.put(url, form);
  }
}

let userAPI = new UserAPI();
let xcsrfHeaders = cookie.load('sfcsrftoken');
userAPI.initForSeahubUsage({ siteRoot, xcsrfHeaders });

export { userAPI };
