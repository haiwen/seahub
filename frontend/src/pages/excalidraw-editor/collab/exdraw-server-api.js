import axios from 'axios';

class ExdrawServerApi {

  constructor(options) {
    this.server = options.exdrawServer;
    this.docUuid = options.exdrawUuid;
    this.accessToken = options.accessToken;
  }

  getSceneContent() {
    const { server, docUuid, accessToken } = this;
    const url = `${server}/api/v1/docs/read/${docUuid}/`;

    return axios.get(url, { headers: { Authorization: `Token ${accessToken}` } });
  }

  saveSceneContent(content) {
    const { server, docUuid, accessToken } = this;
    const url = `${server}/api/v1/docs/update/${docUuid}/`;

    const formData = new FormData();
    formData.append('doc_content', content);

    return axios.post(url, formData, { headers: { Authorization: `Token ${accessToken}` } });
  }
}

export default ExdrawServerApi;
