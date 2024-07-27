import axios from 'axios';
import cookie from 'react-cookies';
import { siteRoot } from './constants';

class SystemAdminAPI {

  init({ server, username, password, token }) {
    this.server = server;
    this.username = username;
    this.password = password;
    this.token = token; // none
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

  sysAdminListUsers(page, perPage, isLDAPImported, sortBy, sortOrder, is_active, role) {
    let url = this.server + '/api/v2.1/admin/users/';
    let params = {
      page: page,
      per_page: perPage,
    };
    if (is_active) {
      params.is_active = is_active;
    }
    if (role) {
      params.role = role;
    }
    if (isLDAPImported) {
      params.source = 'LDAPImport';
    }
    if (sortBy) {
      params.order_by = sortBy;
      params.direction = sortOrder;
    }
    return this.req.get(url, { params: params });
  }

  sysAdminExportLogsExcel(start, end, logType) {
    const url = this.server + '/api/v2.1/admin/logs/export-excel/';
    const params = {
      start: start,
      end: end,
      logType: logType
    };
    return this.req.get(url, { params: params });
  }

  queryAsyncOperationExportExcel(task_id) {
    const url = this.server + '/api/v2.1/query-export-status/?task_id=' + task_id;
    return this.req.get(url);
  }

  adminGroup2Department(groupID) {
    const url = this.server + '/api/v2.1/admin/groups/' + groupID + '/group-to-department/';
    return this.req.post(url);
  }

}

let systemAdminAPI = new SystemAdminAPI();
let xcsrfHeaders = cookie.load('sfcsrftoken');
systemAdminAPI.initForSeahubUsage({ siteRoot, xcsrfHeaders });

export { systemAdminAPI };
