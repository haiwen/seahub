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

  modifyMetadataDetailsSettings(repoID, settings) {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/metadata/details-settings/';
    const data = { settings: settings };
    return this.req.put(url, data);
  }

  getMetadata(repoID, params) {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/metadata/records/';
    return this.req.get(url, { params: params });
  }

  modifyRecords = (repoID, recordsData, is_copy_paste = false) => {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/metadata/records/';
    let data = { records_data: recordsData };
    if (is_copy_paste) {
      data.is_copy_paste = 'true';
    }
    return this.req.put(url, data);
  };

  getRecord(repoID, { recordId, parentDir, fileName }) {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/metadata/record/';
    let params = {};
    if (recordId) {
      params['record_id'] = recordId;
    } else {
      if (parentDir) {
        params['parent_dir'] = parentDir;
      }
      if (fileName) {
        params['file_name'] = fileName;
      }
    }
    return this.req.get(url, { params: params });
  }

  modifyRecord(repoID, { recordId, parentDir, fileName }, updateData) {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/metadata/record/';
    let data = {
      'data': updateData
    };
    if (recordId) {
      data['record_id'] = recordId;
    } else {
      if (parentDir) {
        data['parent_dir'] = parentDir;
      }
      if (fileName) {
        data['file_name'] = fileName;
      }
    }
    return this.req.put(url, data);
  }

  listUserInfo = (userIds) => {
    const url = this.server + '/api/v2.1/user-list/';
    const params = { user_id_list: userIds };
    return this._sendPostRequest(url, params, { headers: { 'Content-type': 'application/json' } });
  };

  // views
  addFolder = (repoID, name) => {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/metadata/folders/';
    const params = { name };
    return this._sendPostRequest(url, params, { headers: { 'Content-type': 'application/json' } });
  };

  modifyFolder = (repoID, folder_id, folder_data) => {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/metadata/folders/';
    const params = {
      folder_id,
      folder_data,
    };
    return this.req.put(url, params);
  };

  deleteFolder = (repoID, folder_id) => {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/metadata/folders/';
    const params = { folder_id };
    return this.req.delete(url, { data: params });
  };

  listViews = (repoID) => {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/metadata/views/';
    return this.req.get(url);
  };

  getView = (repoID, viewId) => {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/metadata/views/' + viewId + '/';
    return this.req.get(url);
  };

  addView = (repoID, name, type = 'table', folder_id = '') => {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/metadata/views/';
    let params = {
      name,
      type,
      data: {
        basic_filters: VIEW_TYPE_DEFAULT_BASIC_FILTER[type],
        sorts: VIEW_TYPE_DEFAULT_SORTS[type],
      }
    };
    if (folder_id) {
      params.folder_id = folder_id;
    }
    return this._sendPostRequest(url, params, { headers: { 'Content-type': 'application/json' } });
  };

  duplicateView = (repoID, viewId, folder_id = '') => {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/metadata/duplicate-view/';
    let params = { view_id: viewId };
    if (folder_id) {
      params.folder_id = folder_id;
    }
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

  deleteView = (repoID, viewId, folder_id = '') => {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/metadata/views/';
    let params = { view_id: viewId };
    if (folder_id) {
      params.folder_id = folder_id;
    }
    return this.req.delete(url, { data: params });
  };

  moveView = (repoID, source_view_id, source_folder_id, target_view_id, target_folder_id, is_above_folder) => {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/metadata/move-views/';
    const params = {
      source_view_id,
      source_folder_id,
      target_view_id,
      target_folder_id,
      is_above_folder,
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

  generateFileTags = (repoID, filePath) => {
    const url = this.server + '/api/v2.1/ai/generate-file-tags/';
    const params = {
      path: filePath,
      repo_id: repoID,
    };
    return this.req.post(url, params);
  };

  extractFileDetails = (repoID, objIds) => {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/metadata/extract-file-details/';
    const params = {
      obj_ids: objIds,
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

  closeFaceRecognition = (repoID) => {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/metadata/face-recognition/';
    return this.req.delete(url);
  };

  recognizeFaces = (repoID, objIds) => {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/metadata/recognize-faces/';
    const params = {
      obj_ids: objIds,
    };
    return this.req.post(url, params);
  };

  getFaceData = (repoID, start = 0, limit = 1000) => {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/metadata/face-records/?start=' + start + '&limit=' + limit;
    return this.req.get(url);
  };

  renamePeople = (repoID, recordId, name) => {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/metadata/face-record/';
    const params = {
      record_id: recordId,
      name: name,
    };
    return this.req.put(url, params);
  };

  getPeoplePhotos = (repoID, peopleId, start = 0, limit = 1000) => {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/metadata/people-photos/' + peopleId + '/?start=' + start + '&limit=' + limit;
    return this.req.get(url);
  };

  removePeoplePhotos = (repoID, peopleId, recordIds) => {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/metadata/people-photos/' + peopleId + '/';
    const params = {
      record_ids: recordIds
    };
    return this.req.delete(url, { data: params });
  };

  addPeoplePhotos = (repoID, peopleIds, recordIds) => {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/metadata/people-photos/';
    const params = {
      record_ids: recordIds,
      people_ids: peopleIds,
    };
    return this.req.post(url, params);
  };

  setPeoplePhoto = (repoID, peopleId, recordId) => {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/metadata/people-cover-photo/' + peopleId + '/';
    const params = {
      record_id: recordId
    };
    return this.req.put(url, params);
  };

  // ocr
  openOCR = (repoID) => {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/metadata/ocr/';
    return this.req.put(url);
  };

  closeOCR = (repoID) => {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/metadata/ocr/';
    return this.req.delete(url);
  };

  ocr = (repoID, filePath) => {
    const url = this.server + '/api/v2.1/ai/ocr/';
    const params = {
      path: filePath,
      repo_id: repoID,
    };
    return this.req.post(url, params);
  };

  extractText = (repoID, filePath) => {
    const url = this.server + '/api/v2.1/ai/extract-text/';
    const params = {
      path: filePath,
      repo_id: repoID,
    };
    return this.req.post(url, params);
  };

}

const metadataAPI = new MetadataManagerAPI();
const xcsrfHeaders = cookie.load('sfcsrftoken');
metadataAPI.initForSeahubUsage({ siteRoot, xcsrfHeaders });

export default metadataAPI;
export { MetadataManagerAPI };
