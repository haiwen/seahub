import axios from 'axios';
import cookie from 'react-cookies';
import { siteRoot } from '../utils/constants';
import { VIEW_TYPE_DEFAULT_BASIC_FILTER, VIEW_TYPE_DEFAULT_SORTS } from './constants';

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

  getMetadataStatus(repoID) {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/metadata/';
    return this.req.get(url);
  }

  createMetadata(repoID) {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/metadata/';
    return this.req.put(url);
  }

  deleteMetadata(repoID) {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/metadata/';
    return this.req.delete(url);
  }

  getMetadata(repoID, params) {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/metadata/records/';
    return this.req.get(url, { params: params });
  }

  getMetadataRecordInfo(repoID, parentDir, name) {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/metadata/record/';
    let params = {};
    if (parentDir) {
      params['parent_dir'] = parentDir;
    }
    if (name) {
      params['name'] = name;
    }
    return this.req.get(url, { params: params });
  }

  modifyRecord = (repoID, recordID, update, objID) => {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/metadata/records/';
    const data = { records_data: [{ record_id: recordID, record: update, obj_id: objID }] };
    return this.req.put(url, data);
  };

  modifyRecords = (repoID, recordsData, is_copy_paste = false) => {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/metadata/records/';
    let data = { records_data: recordsData };
    if (is_copy_paste) {
      data.is_copy_paste = 'true';
    }
    return this.req.put(url, data);
  };

  listUserInfo = (userIds) => {
    const url = this.server + '/api/v2.1/user-list/';
    const params = { user_id_list: userIds };
    return this._sendPostRequest(url, params, { headers: { 'Content-type': 'application/json' } });
  };

  // view
  listViews = (repoID) => {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/metadata/views/';
    return this.req.get(url);
  };

  getView = (repoID, viewId) => {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/metadata/views/' + viewId + '/';
    return this.req.get(url);
  };

  addView = (repoID, name, type = 'table') => {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/metadata/views/';
    let params = {
      name,
      type,
      data: {
        basic_filters: VIEW_TYPE_DEFAULT_BASIC_FILTER[type],
        sorts: VIEW_TYPE_DEFAULT_SORTS[type],
      }
    };
    return this._sendPostRequest(url, params, { headers: { 'Content-type': 'application/json' } });
  };

  duplicateView = (repoID, viewId) => {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/metadata/duplicate-view/';
    const params = { view_id: viewId };
    return this._sendPostRequest(url, params, { headers: { 'Content-type': 'application/json' } });
  };

  modifyView = (repoID, viewId, viewData) => {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/metadata/views/';
    const params = {
      view_id: viewId,
      view_data: viewData,
    };
    return this.req.put(url, params);
  };

  deleteView = (repoID, viewId) => {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/metadata/views/';
    const params = {
      view_id: viewId,
    };
    return this.req.delete(url, { data: params });
  };

  moveView = (repoID, viewId, targetViewId) => {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/metadata/move-views/';
    const params = {
      view_id: viewId,
      target_view_id: targetViewId,
    };
    return this._sendPostRequest(url, params, { headers: { 'Content-type': 'application/json' } });
  };

  // column
  insertColumn = (repoID, name, type, { key, data }) => {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/metadata/columns/';
    let params = {
      'column_name': name,
      'column_type': type,
    };
    if (key) {
      params['column_key'] = key;
    }

    if (data) {
      params['column_data'] = data;
    }
    return this.req.post(url, params);
  };

  deleteColumn = (repoID, columnKey) => {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/metadata/columns/';
    const params = {
      column_key: columnKey,
    };
    return this.req.delete(url, { data: params });
  };

  renameColumn = (repoID, columnKey, name) => {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/metadata/columns/';
    const params = {
      column_key: columnKey,
      name: name,
    };
    return this.req.put(url, params);
  };

  modifyColumnData = (repoID, columnKey, data) => {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/metadata/columns/';
    const params = {
      column_key: columnKey,
      data: data,
    };
    return this.req.put(url, params);
  };

  // ai
  generateDescription = (repoID, filePath) => {
    const url = this.server + '/api/v2.1/ai/generate-summary/';
    const params = {
      path: filePath,
      repo_id: repoID,
    };
    return this.req.post(url, params);
  };

  imageCaption = (repoID, filePath, lang) => {
    const url = this.server + '/api/v2.1/ai/image-caption/';
    const params = {
      path: filePath,
      repo_id: repoID,
      lang: lang,
    };
    return this.req.post(url, params);
  };

  zipDownload(repoID, parent_dir, dirents) {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/zip-task/';
    const form = new FormData();
    form.append('parent_dir', parent_dir);
    dirents.forEach(item => {
      form.append('dirents', item);
    });

    return this._sendPostRequest(url, form);
  }

  /**
   * Delete multiple files or folders in a repository, used to delete images in gallery originally
   * @param {string} repoID - The ID of the repository
   * @param {string[]} dirents - Array of file/folder paths to delete
   * @returns {Promise} Axios delete request promise
   */
  batchDeleteFiles(repo_id, file_names) {
    const url = this.server + '/api/v2.1/repos/batch-delete-folders-item/';
    const data = {
      repo_id,
      file_names,
    };
    return this.req.delete(url, { data });
  }

  // face recognition
  getFaceRecognitionStatus(repoID) {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/metadata/face-recognition/';
    return this.req.get(url);
  }

  openFaceRecognition = (repoID) => {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/metadata/face-recognition/';
    return this.req.post(url);
  };

  getFaceData = (repoID) => {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/metadata/face-records/';
    return this.req.get(url);
  };

  updateFaceName = (repoID, recordID, name) => {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/metadata/face-record/';
    const params = {
      record_id: recordID,
      name: name,
    };
    return this.req.put(url, params);
  };

}

const metadataAPI = new MetadataManagerAPI();
const xcsrfHeaders = cookie.load('sfcsrftoken');
metadataAPI.initForSeahubUsage({ siteRoot, xcsrfHeaders });

export default metadataAPI;
