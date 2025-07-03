import Url from 'url-parse';
import ExcalidrawServerApi from './api';
import editorApi from './api/editor-api';

const { avatarURL } = window.app.config;
const { docUuid, excalidrawServerUrl } = window.app.pageOptions;
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

}

const context = new Context();

export default context;
