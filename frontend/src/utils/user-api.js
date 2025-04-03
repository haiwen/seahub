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

  resetPassword(oldPassword, newPassword) {
    let url = this.server + '/api/v2.1/user/reset-password/';
    let data = {
      old_password: oldPassword,
      new_password: newPassword
    };
    return this.req.post(url, data);
  }

  queryIOStatus(task_id) {
    const url = this.server + '/api/v2.1/query-io-status/?task_id=' + task_id;
    return this.req.get(url);
  }

  depAdminTransferRepo(repo_id, group_id, email, reshare) {
    const url = this.server + '/api/v2.1/groups/' + group_id + '/group-owned-libraries/' + repo_id + '/transfer/';
    const formData = new FormData();
    formData.append('email', email);
    formData.append('reshare', reshare);
    return this.req.put(url, formData);
  }

  transferRepo(repoID, owner, reshare) {
    const url = this.server + '/api2/repos/' + repoID + '/owner/';
    const form = new FormData();
    form.append('owner', owner);
    form.append('reshare', reshare);
    return this.req.put(url, form);
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

  getNotificationToken(repoID) {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/repo-notification-jwt-token/';
    return this.req.get(url);
  }

}

let userAPI = new UserAPI();
let xcsrfHeaders = cookie.load('sfcsrftoken');
userAPI.initForSeahubUsage({ siteRoot, xcsrfHeaders });

export { userAPI };
