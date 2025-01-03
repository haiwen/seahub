import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';

const { repoID, filePath, fileName } = window.app.pageOptions;
let dirPath = Utils.getDirName(filePath);

class EditorApi {

  saveContent(content) {
    return (
      seafileAPI.getUpdateLink(repoID, dirPath).then((res) => {
        const uploadLink = res.data;
        return seafileAPI.updateFile(uploadLink, filePath, fileName, content);
      })
    );
  }
}

const editorApi = new EditorApi();

export default editorApi;
