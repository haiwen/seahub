import axios from 'axios';
import Cookies from 'js-cookie';
import { siteRoot } from '@/utils/constants';

class MetadataManagerAPI {

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

  _sendPostRequest(url, form) {
    if (form.getHeaders) {
      return this.req.post(url, form, {
        headers: form.getHeaders()
      });
    } else {
      return this.req.post(url, form);
    }
  }

  getCollaborators = (repoID) => {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/related-users/';
    return this.req.get(url);
  };

  listUserInfo = (userIds) => {
    const url = this.server + '/api/v2.1/user-list/';
    const params = { user_id_list: userIds };
    return this._sendPostRequest(url, params, { headers: { 'Content-type': 'application/json' } });
  };

  getMetadata(wikiId, viewId, params) {
    const url = this.server + '/api/v2.1/wiki2/' + wikiId + '/views/' + viewId + '/records/';
    return this.req.get(url, { params: params });
  }

  getView(wikiId, viewId) {
    const url = this.server + '/api/v2.1/wiki2/' + wikiId + '/views/' + viewId + '/';
    return this.req.get(url);
  }

  modifyView(wikiId, viewId, viewData) {
    const url = this.server + '/api/v2.1/wiki2/' + wikiId + '/views/';
    const data = {
      view_id: viewId,
      view_data: viewData,
    };
    return this.req.put(url, data);
  }


}

const metadataAPI = new MetadataManagerAPI();
const xcsrfHeaders = Cookies.get('sfcsrftoken');
metadataAPI.initForSeahubUsage({ siteRoot, xcsrfHeaders });

export default metadataAPI;
