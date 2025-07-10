import axios from 'axios';

class SDocServerApi {

  constructor(options) {
    if (!options.docUuid) {
      throw new Error('settings has no docUuid');
    }
    if (!options.sdocServer) {
      throw new Error('settings has no sdocServer');
    }
    if (!options.accessToken) {
      throw new Error('settings has no accessToken');
    }

    this.server = options.sdocServer;
    this.docUuid = options.docUuid;
    this.accessToken = options.accessToken;
  }

  getDocContent() {
    const { server, docUuid, accessToken } = this;
    const url = `${server}/api/v1/docs/${docUuid}/`;

    return axios.get(url, { headers: { Authorization: `Token ${accessToken}` } });
  }

  saveDocContent(content) {
    const { server, docUuid, accessToken } = this;
    const url = `${server}/api/v1/docs/${docUuid}/`;

    const formData = new FormData();
    formData.append('doc_content', content);


    return axios.post(url, formData, { headers: { Authorization: `Token ${accessToken}` } });
  }

}

export default SDocServerApi;
