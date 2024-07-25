import axios from 'axios';
import cookie from 'react-cookies';
import { siteRoot } from './constants';

class OrgAdminAPI {

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

  orgAdminGroup2Department(orgID, groupID) {
    var url = this.server + '/api/v2.1/org/' + orgID + '/admin/groups/' + groupID + '/group-to-department/';
    return this.req.post(url);
  }

}

let orgAdminAPI = new OrgAdminAPI();
let xcsrfHeaders = cookie.load('sfcsrftoken');
orgAdminAPI.initForSeahubUsage({ siteRoot, xcsrfHeaders });

export { orgAdminAPI };
