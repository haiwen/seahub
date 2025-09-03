import Url from 'url-parse';
import ExcalidrawServerApi from './api';
import editorApi from './api/editor-api';
import axios from 'axios';

const { avatarURL } = window.app.config;
const { docUuid, excalidrawServerUrl, server } = window.app.pageOptions;
const userInfo = window.app.userInfo;


class Context {
  constructor() {
    this.docUuid = '';
    this.exdrawServer = '';
    this.user = null;
    this.accessToken = '';
  }

  initSettings = async () => {
    this.docUuid = docUuid;
    this.exdrawServer = excalidrawServerUrl;
    this.user = { ...userInfo, _username: userInfo.username, username: userInfo.name, avatarUrl: avatarURL };
    const resResult = await editorApi.getExdrawToken();
    const accessToken = resResult;
    this.accessToken = accessToken;
    this.exdrawApi = new ExcalidrawServerApi({ exdrawUuid: docUuid, exdrawServer: excalidrawServerUrl, accessToken });
  };

  getDocUuid = () => {
    return this.docUuid;
  };

  getSettings = () => {
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

    const url = `${server}/api/v2.1/exdraw/upload-image/${docUuid}/`;
    const form = new FormData();
    form.append('image_data', fileItem.dataURL);
    form.append('image_id', fileUuid);

    return axios.post(url, form, { headers: { Authorization: `Token ${accessToken}` } });
  };

  downloadExdrawImage = (fileUuid) => {
    const docUuid = this.getDocUuid();
    const accessToken = this.accessToken;

    const url = `${server}/api/v2.1/exdraw/download-image/${docUuid}/${fileUuid}`;
    return axios.get(url, { headers: { Authorization: `Token ${accessToken}` } });
  };

  // local files
  getLocalFiles(p, type) {
    const docUuid = this.getDocUuid();
    const accessToken = this.accessToken;
    // const url = `${server}/api/v2.1/exdraw/dir/${docUuid}/?p=${p}&type=${type}&doc_uuid=${docUuid}`;
    const url = `${server}/api/v2.1/seadoc/dir/${docUuid}/?p=${p}&type=${type}&doc_uuid=${docUuid}`;

    return axios.get(url, { headers: { Authorization: `Token ${accessToken}` } });
  }

  getSearchFilesByFilename(query, page, per_page, search_type) {
    const docUuid = this.getDocUuid();
    const accessToken = this.accessToken;
    const url = 'api/v2.1/seadoc/search-filename/' + docUuid + '/?query=' + query + '&page=' + page + '&per_page=' + per_page + '&search_type=' + search_type;

    return axios.get(url, { headers: { Authorization: `Token ${accessToken}` } });
  }

}

const context = new Context();

export default context;
