import axios from 'axios';

class SDocServerApi {

  constructor(options) {
    this.server = options.sdocServer;
    this.docUuid = options.docUuid;
    this.accessToken = options.accessToken;
  }

  getDocContent() {
    const { server, docUuid, accessToken } = this;
    const url = `${server}/api/v1/docs/${docUuid}/`;
    return axios.get(url, { headers: { Authorization: `Token ${accessToken}` } });
  }

  reloadDocContent(fileName) {
    const { server, docUuid, accessToken } = this;
    const url = `${server}/api/v1/docs/${docUuid}/replace/`;
    const formData = new FormData();
    formData.append('doc_uuid', docUuid);
    formData.append('doc_name', fileName);
    return axios.post(url, formData, { headers: { Authorization: `Token ${accessToken}` } });
  }

  getCollaborator() {
    const { server, docUuid, accessToken } = this;
    const url = `${server}/api/v1/docs/${docUuid}/collaborators/`;
    return axios.get(url, { headers: { Authorization: `Token ${accessToken}` } });
  }

}

export default SDocServerApi;
