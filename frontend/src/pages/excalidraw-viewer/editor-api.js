import axios from 'axios';
import { seafileAPI } from '../../utils/seafile-api';

const { rawPath, docUuid, exdrawAccessToken, exdrawServerUrl } = window.shared.pageOptions;

class EditorApi {

  getFileContent = () => {
    return seafileAPI.getFileContent(rawPath);
  };

  getExdrawContent = () => {
    const url = `${exdrawServerUrl}/api/v1/exdraw/${docUuid}/`;
    return axios.get(url, { headers: { Authorization: `Token ${exdrawAccessToken}` } });
  };
}

const editorApi = new EditorApi();

export default editorApi;
