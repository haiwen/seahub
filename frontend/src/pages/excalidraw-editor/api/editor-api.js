import { seafileAPI } from '../../../utils/seafile-api';
import { Utils } from '../../../utils/utils';

const { repoID, filePath, fileName } = window.app.pageOptions;

class EditorApi {

  saveContent(content) {
    let dirPath = Utils.getDirName(filePath);
    return seafileAPI.getUpdateLink(repoID, dirPath).then((res) => {
      const uploadLink = res.data;
      return seafileAPI.updateFile(uploadLink, filePath, fileName, content);
    });
  }

  getFileContent = () => {
    return seafileAPI.getFileDownloadLink(repoID, filePath).then(res => {
      const downLoadUrl = res.data;
      return seafileAPI.getFileContent(downLoadUrl);
    });
  };

  getExdrawToken = () => {
    return seafileAPI.getExdrawToken(repoID, filePath).then((res => {
      return res.data.access_token;
    }));
  };
}

const editorApi = new EditorApi();

export default editorApi;
