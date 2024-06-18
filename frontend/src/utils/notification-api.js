import axios from 'axios';
import cookie from 'react-cookies';
import { siteRoot } from './constants';

class NotificationAPI {

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

  _sendPostRequest(url, form) {
    if (form.getHeaders) {
      return this.req.post(url, form, {
        headers:form.getHeaders()
      });
    } else {
      return this.req.post(url, form);
    }
  }

  listSysUserUnseenNotifications() {
    const url = this.server + '/api/v2.1/sys-user-notifications/unseen/';
    return this.req.get(url);

  }

  setSysUserNotificationToSeen(notificationID){
    const url = this.server + 'api/v2.1/sys-user-notifications/'+notificationID+'/seen/';
    return this.req.put(url);
  }


}

let notificationAPI = new NotificationAPI();
let xcsrfHeaders = cookie.load('sfcsrftoken');
notificationAPI.initForSeahubUsage({ siteRoot, xcsrfHeaders });

export { notificationAPI };
