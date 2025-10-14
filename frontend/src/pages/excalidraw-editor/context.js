import Url from 'url-parse';
import ExcalidrawServerApi from './api';
import axios from 'axios';

class Context {
  constructor() {
    this.docUuid = '';
    this.exdrawServer = '';
    this.user = null;
    this.accessToken = '';
  }

  initSettings = () => {
    this.settings = window.excalidraw;
    const { serviceURL, excalidrawServerUrl, docUuid, userInfo, accessToken, avatarURL } = this.settings;

    this.serviceURL = serviceURL;
    this.exdrawServer = excalidrawServerUrl;
    this.docUuid = docUuid;
    this.user = { ...userInfo, _username: userInfo.username, username: userInfo.name, avatarUrl: avatarURL };
    this.accessToken = accessToken;
    this.exdrawApi = new ExcalidrawServerApi({ exdrawUuid: docUuid, exdrawServer: excalidrawServerUrl, accessToken });
  };

  getDocUuid = () => {
    return this.docUuid;
  };

  getSetting = (key) => {
    return this.settings[key];
  };

  getExdrawConfig = () => {
    return {
      docUuid: this.docUuid,
      exdrawServer: new Url(this.exdrawServer).origin,
      accessToken: this.accessToken,
      user: this.user,
    };
  };

  getSceneContent = () => {
    return this.exdrawApi.getSceneContent();
  };

  saveSceneContent = (content) => {
    return this.exdrawApi.saveSceneContent(content);
  };

  uploadExdrawImage = (fileUuid, fileItem) => {
    const docUuid = this.getDocUuid();
    const accessToken = this.accessToken;
    const serviceURL = this.serviceURL;
    const url = `${serviceURL}/api/v2.1/exdraw/upload-image/${docUuid}/`;
    const form = new FormData();
    form.append('image_data', fileItem.dataURL);
    form.append('image_id', fileUuid);

    return axios.post(url, form, { headers: { Authorization: `Token ${accessToken}` } });
  };

  downloadExdrawImage = (fileUuid) => {
    const docUuid = this.getDocUuid();
    const accessToken = this.accessToken;
    const serviceURL = this.serviceURL;
    const url = `${serviceURL}/api/v2.1/exdraw/download-image/${docUuid}/${fileUuid}`;
    return axios.get(url, { headers: { Authorization: `Token ${accessToken}` } });
  };

  // local files
  getLocalFiles(p, type) {
    const docUuid = this.getDocUuid();
    const accessToken = this.accessToken;
    const serviceURL = this.serviceURL;
    const url = `${serviceURL}/api/v2.1/seadoc/dir/${docUuid}/?p=${p}&type=${type}&doc_uuid=${docUuid}`;
    return axios.get(url, { headers: { Authorization: `Token ${accessToken}` } });
  }

  getSearchFilesByFilename(query, page, per_page, search_type) {
    const docUuid = this.getDocUuid();
    const accessToken = this.accessToken;
    const serviceURL = this.serviceURL;
    const url = serviceURL + '/api/v2.1/seadoc/search-filename/' + docUuid + '/?query=' + query + '&page=' + page + '&per_page=' + per_page + '&search_type=' + search_type;

    return axios.get(url, { headers: { Authorization: `Token ${accessToken}` } });
  }

}

const context = new Context();

export default context;
