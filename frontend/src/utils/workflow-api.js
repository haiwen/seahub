import axios from 'axios';
import Cookies from 'js-cookie';
import { siteRoot } from './constants';

class WorkflowAPI {

  init({ server, username, password, token }) {
    this.server = server;
    this.username = username;
    this.password = password;
    this.token = token;
    if (this.token && this.server) {
      this.req = axios.create({
        baseURL: this.server,
        headers: { 'Authorization': 'Token ' + this.token },
      });
    }
    return this;
  }

  initForSeahubUsage({ siteRoot, xcsrfHeaders }) {
    if (siteRoot && siteRoot.charAt(siteRoot.length - 1) === '/') {
      var server = siteRoot.substring(0, siteRoot.length - 1);
      this.server = server;
    } else {
      this.server = siteRoot;
    }

    this.req = axios.create({
      headers: {
        'X-CSRFToken': xcsrfHeaders,
      }
    });
    return this;
  }

  _sendPostRequest(url, form) {
    if (form.getHeaders) {
      return this.req.post(url, form, {
        headers: form.getHeaders()
      });
    } else {
      return this.req.post(url, form);
    }
  }

  listWorkflows(repoId) {
    const url = this.server + '/api/v2.1/repos/' + repoId + '/workflows/';

    return this.req.get(url);
  }

  getWorkflow(repoId, workflowId) {
    const url = this.server + '/api/v2.1/repos/' + repoId + '/workflows/' + workflowId + '/';
    return this.req.get(url);
  }

  createWorkflow(repoId, data) {
    const url = this.server + '/api/v2.1/repos/' + repoId + '/workflows/';
    return this.req.post(url, data);
  }

  // Update an existing workflow
  updateWorkflow(repoId, workflowId, data) {
    const url = this.server + '/api/v2.1/repos/' + repoId + '/workflows/' + workflowId + '/';
    return this.req.put(url, data);
  }

  // Delete a workflow
  deleteWorkflow(repoId, workflowId) {
    const url = this.server + '/api/v2.1/repos/' + repoId + '/workflows/' + workflowId + '/';
    return this.req.delete(url);
  }

}

let workflowAPI = new WorkflowAPI();
let xcsrfHeaders = Cookies.get('sfcsrftoken');
workflowAPI.initForSeahubUsage({ siteRoot, xcsrfHeaders });

export default workflowAPI;
