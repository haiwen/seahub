import cookie from 'react-cookies';
import axios from 'axios';
import FormData from 'form-data';
import { siteRoot } from './constants';

class WikiAPI {

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

  listWikiDepartments() {
    const url = this.server + '/api/v2.1/departments/';
    const params = { can_admin: true };
    return this.req.get(url, { params: params });
  }

  listWikiDir(wikiId, dirPath, withParents) {
    const path = encodeURIComponent(dirPath);
    let url = this.server + '/api/v2.1/wikis/' + wikiId + '/dir/?p=' + path;
    if (withParents) {
      url = this.server + '/api/v2.1/wikis/' + wikiId + '/dir/?p=' + path + '&with_parents=' + withParents;
    }
    return this.req.get(url);
  }


  getWikiFileContent(wikiId, filePath) {
    const path = encodeURIComponent(filePath);
    const time = new Date().getTime();
    const url = this.server + '/api/v2.1/wikis/' + wikiId + '/content/' + '?p=' + path + '&_=' + time;
    return this.req.get(url);
  }


  listWikis(options) {
    /*
     * options: `{type: 'shared'}`, `{type: ['mine', 'shared', ...]}`
     */
    let url = this.server + '/api/v2.1/wikis/';
    if (!options) {
      // fetch all types of wikis
      return this.req.get(url);
    }
    return this.req.get(url, {
      params: options,
      paramsSerializer: {
        serialize: function(params) {
          let list = [];
          for (let key in params) {
            if (Array.isArray(params[key])) {
              for (let i = 0, len = params[key].length; i < len; i++) {
                list.push(key + '=' + encodeURIComponent(params[key][i]));
              }
            } else {
              list.push(key + '=' + encodeURIComponent(params[key]));
            }
          }
          return list.join('&');
        }
      }
    });
  }

  addWiki(wikiName) {
    const url = this.server + '/api/v2.1/wikis/';
    let form = new FormData();
    form.append('name', wikiName);
    return this._sendPostRequest(url, form);
  }

  renameWiki(wikiId, wikiName) {
    const url = this.server + '/api/v2.1/wikis/' + wikiId + '/';
    let form = new FormData();
    form.append('wiki_name', wikiName);
    return this._sendPostRequest(url, form);
  }

  deleteWiki(wikiId) {
    const url = this.server + '/api/v2.1/wikis/' + wikiId + '/';
    return this.req.delete(url);
  }


  // for wiki2
  listWikis2(options) {
    /*
     * options: `{type: 'shared'}`, `{type: ['mine', 'shared', ...]}`
     */
    let url = this.server + '/api/v2.1/wikis2/';
    if (!options) {
      // fetch all types of wikis
      return this.req.get(url);
    }
    return this.req.get(url, {
      params: options,
      paramsSerializer: {
        serialize: function(params) {
          let list = [];
          for (let key in params) {
            if (Array.isArray(params[key])) {
              for (let i = 0, len = params[key].length; i < len; i++) {
                list.push(key + '=' + encodeURIComponent(params[key][i]));
              }
            } else {
              list.push(key + '=' + encodeURIComponent(params[key]));
            }
          }
          return list.join('&');
        }
      }
    });
  }

  addWiki2(wikiName, owner) {
    const url = this.server + '/api/v2.1/wikis2/';
    let form = new FormData();
    form.append('name', wikiName);
    if (owner) {
      form.append('owner', owner);
    }
    return this._sendPostRequest(url, form);
  }

  deleteWiki2(wikiId) {
    const url = this.server + '/api/v2.1/wiki2/' + wikiId + '/';
    return this.req.delete(url);
  }

  updateWiki2Config(wikiId, wikiConfig) {
    const url = this.server + '/api/v2.1/wiki2/' + wikiId + '/config/';
    let params = {
      wiki_config: wikiConfig
    };
    return this.req.put(url, params);
  }

  getWiki2Config(wikiId) {
    const url = this.server + '/api/v2.1/wiki2/' + wikiId + '/config/';
    return this.req.get(url);
  }

  createWiki2Page(wikiId, pageName, currentId) {
    const url = this.server + '/api/v2.1/wiki2/' + wikiId + '/pages/';
    let form = new FormData();
    form.append('page_name', pageName);
    if (currentId) {
      form.append('current_id', currentId);
    }
    return this._sendPostRequest(url, form);
  }

  deleteWiki2Page(wikiId, pageId) {
    const url = this.server + '/api/v2.1/wiki2/' + wikiId + '/page/' + pageId + '/';
    return this.req.delete(url);
  }

  moveWiki2Page(wikiId, moved_id, target_id) {
    const url = this.server + '/api/v2.1/wiki2/' + wikiId + '/pages/';
    let params = {
      'moved_id': moved_id,
      'target_id': target_id,
    };
    return this.req.put(url, params);
  }

  deleteWiki2Folder(wikiId, folderId) {
    const url = this.server + '/api/v2.1/wiki2/' + wikiId + '/folder/' + folderId + '/';
    return this.req.delete(url);
  }

  getWiki2Page(wikiId, pageId) {
    const url = this.server + '/api/v2.1/wiki2/' + wikiId + '/page/' + pageId + '/';
    return this.req.get(url);
  }

  renameWiki2(wikiId, wikiName) {
    const url = this.server + '/api/v2.1/wiki2/' + wikiId + '/';
    let params = {
      wiki_name: wikiName
    };
    return this.req.put(url, params);
  }

  duplicateWiki2Page(wikiId, pageId) {
    const url = this.server + '/api/v2.1/wiki2/' + wikiId + '/duplicate-page/';
    let form = new FormData();
    form.append('page_id', pageId);
    return this._sendPostRequest(url, form);
  }

}

let wikiAPI = new WikiAPI();
let xcsrfHeaders = cookie.load('sfcsrftoken');
wikiAPI.initForSeahubUsage({ siteRoot, xcsrfHeaders });

export default wikiAPI;
