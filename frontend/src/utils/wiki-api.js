import Cookies from 'js-cookie';
import axios from 'axios';
import FormData from 'form-data';
import { siteRoot } from './constants';

class WikiAPI {

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
        serialize: function (params) {
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
        serialize: function (params) {
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

  getWiki2PublishConfig(wikiId) {
    const url = this.server + '/api/v2.1/wiki2/' + wikiId + '/publish/config/';
    return this.req.get(url);
  }

  createWiki2Page(wikiId, pageName, currentId, insertPosition) {
    const url = this.server + '/api/v2.1/wiki2/' + wikiId + '/pages/';
    let form = new FormData();
    form.append('page_name', pageName);
    if (currentId) {
      form.append('current_id', currentId);
    }
    if (insertPosition) {
      form.append('insert_position', insertPosition);
    }
    return this._sendPostRequest(url, form);
  }

  deleteWiki2Page(wikiId, pageId) {
    const url = this.server + '/api/v2.1/wiki2/' + wikiId + '/page/' + pageId + '/';
    return this.req.delete(url);
  }

  moveWiki2Page(wikiId, moved_id, target_id, move_position) {
    const url = this.server + '/api/v2.1/wiki2/' + wikiId + '/pages/';
    let params = {
      'moved_id': moved_id,
      'target_id': target_id,
      'move_position': move_position
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

  getWiki2PublishPage(wikiId, pageId) {
    const url = this.server + '/api/v2.1/wiki2/' + wikiId + '/publish/page/' + pageId + '/';
    return this.req.get(url);
  }

  updateWiki2PageLock(wikiId, pageId, locked) {
    const url = this.server + '/api/v2.1/wiki2/' + wikiId + '/page/' + pageId + '/';
    let params = {
      is_lock_page: locked
    };
    return this.req.put(url, params);
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

  importWiki2Page(wikiId, pageId, file) {
    const url = this.server + '/api/v2.1/wiki2/' + wikiId + '/import-page/';
    let form = new FormData();
    if (pageId) {
      form.append('from_page_id', pageId);
    }
    if (file) {
      form.append('file', file);
    }
    return this._sendPostRequest(url, form);
  }

  getWikiTrash(wikiId, page, per_page) {
    const url = this.server + '/api/v2.1/wiki2/' + wikiId + '/trash/';
    let params = {
      page: page || 1,
      per_page: per_page
    };
    return this.req.get(url, { params: params });
  }

  revertTrashPage(wikiId, page_id) {
    const url = this.server + '/api/v2.1/wiki2/' + wikiId + '/trash/';
    let params = {
      page_id: page_id
    };
    return this.req.put(url, params);
  }

  cleanWikiTrash(wikiId, days) {
    const url = this.server + '/api/v2.1/wiki2/' + wikiId + '/trash/';
    let params = {
      keep_days: days
    };
    return this.req.delete(url, {
      data: params
    });
  }

  publishWiki(wikiId, publish_url) {
    const url = this.server + '/api/v2.1/wiki2/' + wikiId + '/publish/';
    let form = new FormData();
    form.append('publish_url', publish_url);
    return this._sendPostRequest(url, form);
  }

  getPublishWikiLink(wikiId) {
    const url = this.server + '/api/v2.1/wiki2/' + wikiId + '/publish/';
    return this.req.get(url);
  }

  deletePublishWikiLink(wikiId, customUrl) {
    const url = this.server + '/api/v2.1/wiki2/' + wikiId + '/publish/';
    return this.req.delete(url);
  }

  convertWiki(oldWikiId, wikiName, owner) {
    const url = this.server + '/api/v2.1/convert-wiki/';
    let form = new FormData();
    form.append('old_wiki_id', oldWikiId);
    form.append('name', wikiName);
    if (owner) {
      form.append('owner', owner);
    }
    return this._sendPostRequest(url, form);
  }

  importConfluence(file, departmentID) {
    const url = this.server + '/api/v2.1/import-confluence/';
    const formData = new FormData();
    formData.append('file', file);
    formData.append('group_id', departmentID);
    return this._sendPostRequest(url, formData);
  }

  getWikiSettings(wikiId) {
    const url = this.server + '/api/v2.1/wiki2/' + wikiId + '/settings/';
    return this.req.get(url);
  }

  updateWikiSettings(wikiId, enableLinkRepos) {
    const url = this.server + '/api/v2.1/wiki2/' + wikiId + '/settings/';
    const flag = enableLinkRepos ? 'true' : 'false';
    const params = {
      enable_link_repos: flag
    };
    return this.req.put(url, params);
  }

  addWikiLinkedRepo(wikiId, repoId) {
    const url = this.server + '/api/v2.1/wiki2/' + wikiId + '/linked-repos/';
    const formData = new FormData();
    formData.append('repo_id', repoId);
    return this._sendPostRequest(url, formData);
  }

  deleteWikiLinkedRepo(wikiId, repoId) {
    const url = this.server + '/api/v2.1/wiki2/' + wikiId + '/linked-repos/';
    const params = {
      repo_id: repoId
    };
    return this.req.delete(url, { data: params });
  }

  // addWikiLinkedView(wikiId, params) {
  //   const url = this.server + '/api/v2.1/wiki2/' + wikiId + '/views/';
  //   const formData = new FormData();
  //   formData.append('name', params.name);
  //   formData.append('type', params.type);
  //   formData.append('link_repo_id', params.repo_id);
  //   return this._sendPostRequest(url, formData);
  // }

  // updateWikiLinkedView(wikiId, paramsData) {
  //   const url = this.server + '/api/v2.1/wiki2/' + wikiId + '/views/';
  //   const params = {
  //     view_id: paramsData.view_id,
  //     view_data: paramsData.view_data,
  //   };
  //   return this.req.put(url, params);
  // }

  // deleteWikiLinkedView(wikiId, view_id) {
  //   const url = this.server + '/api/v2.1/wiki2/' + wikiId + '/views/';
  //   const params = {
  //     view_id: view_id,
  //   };
  //   return this.req.delete(url, { data: params });
  // }

  // listWikiLinkedViews(wikiId) {
  //   const url = this.server + '/api/v2.1/wiki2/' + wikiId + '/views/';
  //   return this.req.get(url);
  // }

  // listWikiLinkedViewDetail(wikiId, viewId) {
  //   const url = this.server + '/api/v2.1/wiki2/' + wikiId + '/views/' + viewId + '/';
  //   return this.req.get(url);
  // }

}

let wikiAPI = new WikiAPI();
let xcsrfHeaders = Cookies.get('sfcsrftoken');
wikiAPI.initForSeahubUsage({ siteRoot, xcsrfHeaders });

export default wikiAPI;
