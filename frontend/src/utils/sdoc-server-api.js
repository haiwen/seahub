import axios from 'axios';

class SDocServerApi {

  constructor(options) {
    this.server = options.sdocServer;
    this.docUuid = options.docUuid;
    this.accessToken = options.accessToken;
  }

  getDocContent(docPath, docName) {
    const { server, docUuid, accessToken } = this;
    const url = `${server}/api/v1/docs/${docUuid}/?doc_path=${encodeURIComponent(docPath)}&doc_name=${encodeURIComponent(docName)}`;
    return axios.get(url, { headers: { Authorization: `Token ${accessToken}` } });
  }

}

export default SDocServerApi;
