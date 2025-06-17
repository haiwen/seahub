import ExcalidrawServerApi from './api';
import editorApi from './api/editor-api';

const { docUuid, excalidrawServerUrl } = window.app.pageOptions;

class Context {
  constructor() {
    this.docUuid = '';
    this.exdrawServer = '';
  }

  initSettings = async () => {
    this.docUuid = docUuid;
    this.exdrawServer = excalidrawServerUrl;
    const resResult = await editorApi.getExdrawToken();
    const accessToken = resResult;
    this.exdrawApi = new ExcalidrawServerApi({ exdrawUuid: docUuid, exdrawServer: excalidrawServerUrl, accessToken });
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
