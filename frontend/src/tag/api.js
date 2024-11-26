import axios from 'axios';
import cookie from 'react-cookies';
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

  openTags = (repoID) => {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/metadata/tags-status/';
    return this.req.put(url);
  };

  closeTags = (repoID) => {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/metadata/tags-status/';
    return this.req.delete(url);
  };

  getTags = (repoID) => {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/metadata/tags/';
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

  // file tag
  updateFilesTags = (repoID, data) => {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/metadata/files-tags/';
    const params = {
      files_tags_data: data,
    };
    return this.req.put(url, params);
  };

}

const tagsAPI = new TagsManagerAPI();
const xcsrfHeaders = cookie.load('sfcsrftoken');
tagsAPI.initForSeahubUsage({ siteRoot, xcsrfHeaders });

export default tagsAPI;
