import axios from 'axios';
import Cookies from 'js-cookie';
import { siteRoot } from './constants';

class SubscriptionAPI {

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

  getSubscription() {
    const url = this.server + '/api/v2.1/subscription/';
    return this.req.get(url);
  }

  getSubscriptionPlans(paymentType) {
    const url = this.server + '/api/v2.1/subscription/plans/';
    let params = {
      payment_type: paymentType,
    };
    return this.req.get(url, { params: params });
  }

  getSubscriptionLogs() {
    const url = this.server + '/api/v2.1/subscription/logs/';
    return this.req.get(url);
  }

}

let subscriptionAPI = new SubscriptionAPI();
let xcsrfHeaders = Cookies.get('sfcsrftoken');
subscriptionAPI.initForSeahubUsage({ siteRoot, xcsrfHeaders });

export { subscriptionAPI };
