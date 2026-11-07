import axios from 'axios';
import { seafileAPI } from '@/api/seafile-api';

const { rawPath, docUuid, exdrawAccessToken, exdrawServerUrl, sharedExdrawSceneUrl } = window.shared.pageOptions;

class EditorApi {

  getFileContent = () => {
    return seafileAPI.getFileContent(rawPath);
  };

  getExdrawContent = () => {
    if (sharedExdrawSceneUrl) {
      return axios.get(sharedExdrawSceneUrl);
    }
    const url = `${exdrawServerUrl}/api/v1/exdraw/${docUuid}/`;
    return axios.get(url, { headers: { Authorization: `Token ${exdrawAccessToken}` } });
  };
}

const editorApi = new EditorApi();

export default editorApi;
