import cookie from 'react-cookies';
import axios from 'axios';
import { siteRoot } from './constants';

class SearchAPI {

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

  searchItems(query_str, query_type, cancelToken) {
    let url = this.server + '/api2/items-search/?query_str=' + query_str + '&query_type=' + query_type;
    return this.req.get(url, { cancelToken: cancelToken });
  }

}

let searchAPI = new SearchAPI();
let xcsrfHeaders = cookie.load('sfcsrftoken');
searchAPI.initForSeahubUsage({ siteRoot, xcsrfHeaders });

export default searchAPI;
