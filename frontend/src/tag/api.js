import axios from 'axios';
import Cookies from 'js-cookie';
import { siteRoot } from '../utils/constants';

class TagsManagerAPI {

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

  getTagsStatus = (repoID) => {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/metadata/tags-status/';
    return this.req.get(url);
  };

  openTags = (repoID, lang) => {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/metadata/tags-status/';
    const params = {
      lang: lang,
    };
    return this.req.put(url, params);
  };

  closeTags = (repoID) => {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/metadata/tags-status/';
    return this.req.delete(url);
  };

  getTags = (repoID, start = 0, limit = 1000) => {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/metadata/tags/?start=' + start + '&limit=' + limit;
    return this.req.get(url);
  };

  modifyTags = (repoID, data) => {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/metadata/tags/';
    const params = {
      tags_data: data,
    };
    return this.req.put(url, params);
  };

  deleteTags = (repoID, tagIds) => {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/metadata/tags/';
    const params = {
      tag_ids: tagIds,
    };
    return this.req.delete(url, { data: params });
  };

  addTags = (repoID, tags) => {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/metadata/tags/';
    const params = {
      tags_data: tags
    };
    return this.req.post(url, params);
  };

  getTagFiles = (repoID, tagID) => {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/metadata/tag-files/' + tagID + '/';
    return this.req.get(url);
  };

  getTagsFiles = (repoID, tags_ids) => {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/metadata/tags-files/';
    const params = { tags_ids };
    return this.req.post(url, params);
  };

  // file tags
  updateFileTags = (repoID, data) => {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/metadata/file-tags/';
    const params = {
      file_tags_data: data,
    };
    return this.req.put(url, params);
  };

  addTagLinks = (repoID, link_column_key, row_id_map) => {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/metadata/tags-links/';
    const params = {
      link_column_key,
      row_id_map,
    };
    return this.req.post(url, params);
  };

  deleteTagLinks = (repoID, link_column_key, row_id_map) => {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/metadata/tags-links/';
    const params = {
      link_column_key,
      row_id_map,
    };
    return this.req.delete(url, { data: params });
  };

  mergeTags = (repoID, target_tag_id, merged_tags_ids) => {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/metadata/merge-tags/';
    const params = {
      target_tag_id,
      merged_tags_ids,
    };
    return this.req.post(url, params);
  };

  migrateTags = (repoID) => {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/metadata/migrate-tags/';
    return this.req.post(url);
  };

  exportTags = (repoID, tagsIds) => {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/metadata/export-tags/';
    const params = {
      tags_ids: tagsIds,
    };
    return this.req.post(url, params);
  };

  importTags = (repoID, file) => {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/metadata/import-tags/';
    const formData = new FormData();
    formData.append('file', file);
    return this._sendPostRequest(url, formData);
  };
}

const tagsAPI = new TagsManagerAPI();
const xcsrfHeaders = Cookies.get('sfcsrftoken');
tagsAPI.initForSeahubUsage({ siteRoot, xcsrfHeaders });

export default tagsAPI;
