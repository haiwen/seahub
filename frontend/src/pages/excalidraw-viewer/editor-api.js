import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';

const { repoID, filePath, fileName, rawPath } = window.shared.pageOptions;
let dirPath = Utils.getDirName(filePath);

class EditorApi {

  saveContent(content) {
    return seafileAPI.getUpdateLink(repoID, dirPath).then((res) => {
      const uploadLink = res.data;
      return seafileAPI.updateFile(uploadLink, filePath, fileName, content);
    });
  }

  getFileContent = () => {
    return seafileAPI.getFileContent(rawPath);
  };
}

const editorApi = new EditorApi();

export default editorApi;
