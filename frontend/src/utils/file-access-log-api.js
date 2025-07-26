import Cookies from 'js-cookie';
import { siteRoot } from './constants';
import axios from 'axios';

class FileAccessLogAPI {
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

  listFileAccessLog(repoID, filePath, page, perPage) {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/file/access-log/';
    const params = {
      path: filePath,
      page: page || 1,
      per_page: perPage || 100
    };
    return this.req.get(url, { params: params });
  }

}

let fileAccessLogAPI = new FileAccessLogAPI();
let xcsrfHeaders = Cookies.get('sfcsrftoken');
fileAccessLogAPI.initForSeahubUsage({ siteRoot, xcsrfHeaders });
export { fileAccessLogAPI };
