import ExcalidrawServerApi from './api';
import editorApi from './api/editor-api';

const { docUuid, excalidrawServerUrl } = window.app.pageOptions;

class Context {
  constructor() {
    this.docUuid = '';
    this.exdrawServer = '';
    this.accessToken = '';
  }

  initSettings = async () => {
    this.docUuid = docUuid;
    this.exdrawServer = excalidrawServerUrl;
    const resResult = await editorApi.getExdrawToken();
    const accessToken = resResult;
    this.accessToken = accessToken;
    this.exdrawApi = new ExcalidrawServerApi({ exdrawUuid: docUuid, exdrawServer: excalidrawServerUrl, accessToken });
  };

  getSettings = () => {
    return {
      docUuid: this.docUuid,
      exdrawServer: this.exdrawServer,
      accessToken: this.accessToken,
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
