import axios from 'axios';
import cookie from 'react-cookies';
import { siteRoot } from './constants';

class GroupAPI {

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

  changeGroup2Department(groupID) {
    var url = this.server + '/api/v2.1/groups/' + groupID + '/';
    return this.req.post(url);
  }

}

let groupAPI = new GroupAPI();
let xcsrfHeaders = cookie.load('sfcsrftoken');
groupAPI.initForSeahubUsage({ siteRoot, xcsrfHeaders });

export { groupAPI };
