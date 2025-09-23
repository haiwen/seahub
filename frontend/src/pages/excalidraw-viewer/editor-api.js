import { seafileAPI } from '../../utils/seafile-api';

const { rawPath } = window.shared.pageOptions;

class EditorApi {

  getFileContent = () => {
    return seafileAPI.getFileContent(rawPath);
  };
}

const editorApi = new EditorApi();

export default editorApi;
