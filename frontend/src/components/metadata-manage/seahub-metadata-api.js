import axios from 'axios';
import cookie from 'react-cookies';
import { siteRoot } from '../../utils/constants';

class SeahubMetadataAPI {
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
    if (siteRoot && siteRoot.charAt(siteRoot.length-1) === '/') {
      var server = siteRoot.substring(0, siteRoot.length-1);
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

  getMetadataManagementEnabledStatus(repoID) {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/metadata/';
    return this.req.get(url);
  }

  enableMetadataManagement(repoID) {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/metadata/';
    return this.req.put(url);
  }

  disableMetadataManagement(repoID) {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/metadata/';
    return this.req.delete(url);
  }

  getMetadataRecords(repoID, params) {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/metadata/records/';
    return this.req.get(url, {params: params});
  }

  addMetadataRecords(repoID, parentDir, name) {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/metadata/records/';
    const data = {
      'parent_dir': parentDir,
      'name': name,
    };
    return this.req.post(url, data);
  }

  updateMetadataRecord(repoID, recordID, creator, createTime, modifier, modifyTime, parentDir, name) {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/metadata/records/' + recordID + '/';
    const data = {
      'creator': creator,
      'create_time': createTime,
      'modifier': modifier,
      'modify_time': modifyTime,
      'current_dir': parentDir,
      'name': name,
    };
    return this.req.put(url, data);
  }

  deleteMetadataRecord(repoID, recordID) {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/metadata/records/' + recordID + '/';
    return this.req.delete(url);
  }
}

const seahubMetadataAPI = new SeahubMetadataAPI();
const xcsrfHeaders = cookie.load('sfcsrftoken');
seahubMetadataAPI.initForSeahubUsage({ siteRoot, xcsrfHeaders });

export default seahubMetadataAPI;