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

  updateEmailNotificationInterval(fileUpdatesEmailInterval, collaborateEmailInterval, enablePasswordUpdateEmail, enableLoginEmail) {
    let url = this.server + '/api2/account/info/';
    let data = {
      'file_updates_email_interval': fileUpdatesEmailInterval,
      'collaborate_email_interval': collaborateEmailInterval,
      'enable_password_update_email': enablePasswordUpdateEmail,
      'enable_login_email': enableLoginEmail
    };
    return this.req.put(url, data);
  }

}

let userAPI = new UserAPI();
let xcsrfHeaders = cookie.load('sfcsrftoken');
userAPI.initForSeahubUsage({ siteRoot, xcsrfHeaders });

export { userAPI };
