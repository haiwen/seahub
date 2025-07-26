import axios from 'axios';
import Cookies from 'js-cookie';
import { siteRoot } from '../../../utils/constants';

class InstAdminAPI {

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

  getToken() {
    const url = this.server + '/api2/auth-token/';
    axios.post(url, {
      username: this.username,
      password: this.password
    }).then((response) => {
      this.token = response.data;
      return this.token;
    });
  }

  listInstitutionUsers(page, perPage) {
    const url = this.server + '/api/v2.1/institutions/admin/users/';
    let params = {
    };
    if (page != undefined) {
      params.page = page;
    }
    if (perPage != undefined) {
      params.per_page = perPage;
    }
    return this.req.get(url);
  }

  searchInstitutionUsers(q) {
    const url = this.server + '/api/v2.1/institutions/admin/search-user/';
    const params = {
      q: q
    };
    return this.req.get(url, { params: params });
  }

  deleteInstitutionUser(email) {
    const url = this.server + '/api/v2.1/institutions/admin/users/' + encodeURIComponent(email) + '/';
    return this.req.delete(url);
  }

  getInstitutionUserInfo(email) {
    const url = this.server + '/api/v2.1/institutions/admin/users/' + encodeURIComponent(email) + '/';
    return this.req.get(url);
  }

  setInstitutionUserQuote(email, quota) {
    const url = this.server + '/api/v2.1/institutions/admin/users/' + encodeURIComponent(email) + '/';
    const data = {
      quota_total: quota
    };
    return this.req.put(url, data);
  }

  listInstitutionUserRepos(email) {
    const url = this.server + '/api/v2.1/institutions/admin/users/' + encodeURIComponent(email) + '/libraries/';
    return this.req.get(url);
  }

  listInstitutionUserGroups(email) {
    const url = this.server + '/api/v2.1/institutions/admin/users/' + encodeURIComponent(email) + '/groups/';
    return this.req.get(url);
  }

  updateInstitutionUserStatus(email, is_active) {
    const url = this.server + '/api/v2.1/institutions/admin/users/' + encodeURIComponent(email) + '/';
    const data = {
      is_active: is_active ? 'true' : 'false',
    };
    return this.req.put(url, data);
  }

}


const instAdminAPI = new InstAdminAPI();
const xcsrfHeaders = Cookies.get('sfcsrftoken');
instAdminAPI.initForSeahubUsage({ siteRoot, xcsrfHeaders });

export default instAdminAPI;
