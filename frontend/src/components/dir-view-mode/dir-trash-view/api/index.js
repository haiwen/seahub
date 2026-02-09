import axios from 'axios';
import Cookies from 'js-cookie';
import { siteRoot } from '@/utils/constants';

class RepotrashAPI {

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

  getRepoFolderTrash(repoID, page, per_page) {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/trash2/';
    let params = {
      page: page || 1,
      per_page: per_page
    };
    return this.req.get(url, { params: params });
  }

  searchRepoFolderTrash(repoID, page, per_page, searchQuery = '', filters = {}) {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/trash2/search/';
    let params = {
      page: page || 1,
      per_page: per_page
    };

    if (searchQuery && searchQuery.trim() !== '') {
      params.q = searchQuery.trim();
    }

    if (filters.suffixes) {
      params.suffixes = filters.suffixes;
    }

    if (filters.date && filters.date.from != null && filters.date.to != null) {
      params.time_from = filters.date.from;
      params.time_to = filters.date.to;
    }

    if (filters.creators != null) {
      params.op_users = filters.creators;
    }

    return this.req.get(url, { params: params });
  }

  restoreTrashItems(repoID, items) {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/trash2/revert/';
    return this.req.post(url, items);
  }

}

let repoTrashAPI = new RepotrashAPI();
let xcsrfHeaders = Cookies.get('sfcsrftoken');
repoTrashAPI.initForSeahubUsage({ siteRoot, xcsrfHeaders });

export { repoTrashAPI };
