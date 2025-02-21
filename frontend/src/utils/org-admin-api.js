import axios from 'axios';
import cookie from 'react-cookies';
import FormData from 'form-data';
import { siteRoot } from './constants';

class OrgAdminAPI {

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

  orgAdminGetOrgInfo() {
    const url = this.server + '/api/v2.1/org/admin/info/';
    return this.req.get(url);
  }

  orgAdminGetSysSettingInfo(orgID) {
    const url = this.server + '/api/v2.1/org/' + orgID + '/admin/web-settings/';
    return this.req.get(url);
  }

  orgAdminSetSysSettingInfo(orgID, key, value) {
    const url = this.server + '/api/v2.1/org/' + orgID + '/admin/web-settings/';
    let formData = new FormData();
    formData.append(key, value);
    return this.req.put(url, formData);
  }

  orgAdminUpdateName(orgID, orgName) {
    const url = this.server + '/api/v2.1/org/admin/info/';
    let form = new FormData();
    form.append('org_name', orgName);
    return this.req.put(url, form);
  }

  orgAdminSetOrgUserDefaultQuota(orgID, quota) {
    const url = this.server + '/api/v2.1/org/admin/info/';
    let form = new FormData();
    form.append('user_default_quota', quota);
    return this.req.put(url, form);
  }

  orgAdminUpdateLogo(orgID, file) {
    const url = this.server + '/api/v2.1/org/' + orgID + '/admin/logo/';
    let form = new FormData();
    form.append('file', file);
    return this._sendPostRequest(url, form);
  }

  orgAdminGetSamlConfig(orgID) {
    const url = this.server + '/api/v2.1/org/' + orgID + '/admin/saml-config/';
    return this.req.get(url);
  }

  orgAdminUpdateSamlConfig(orgID, metadataUrl, domain, idpCertificate) {
    const url = this.server + '/api/v2.1/org/' + orgID + '/admin/saml-config/';
    let formData = new FormData();
    if (metadataUrl) {
      formData.append('metadata_url', metadataUrl);
    }
    if (domain) {
      formData.append('domain', domain);
    }
    if (idpCertificate) {
      formData.append('idp_certificate', idpCertificate);
    }
    return this.req.put(url, formData);
  }

  orgAdminVerifyDomain(orgID, domain) {
    const url = this.server + '/api/v2.1/org/' + orgID + '/admin/verify-domain/';
    let data = {
      domain: domain
    };
    return this.req.put(url, data);
  }

  orgAdminStatisticFiles(orgID, startTime, endTime, groupBy) {
    const url = this.server + '/api/v2.1/org/' + orgID + '/admin/statistics/file-operations/';
    let params = {
      start: startTime,
      end: endTime,
      group_by: groupBy
    };
    return this.req.get(url, { params: params });
  }

  orgAdminStatisticStorages(orgID, startTime, endTime, groupBy) {
    const url = this.server + '/api/v2.1/org/' + orgID + '/admin/statistics/total-storage/';
    let params = {
      start: startTime,
      end: endTime,
      group_by: groupBy
    };
    return this.req.get(url, { params: params });
  }

  orgAdminStatisticActiveUsers(orgID, startTime, endTime, groupBy) {
    const url = this.server + '/api/v2.1/org/' + orgID + '/admin/statistics/active-users/';
    let params = {
      start: startTime,
      end: endTime,
      group_by: groupBy
    };
    return this.req.get(url, { params: params });
  }

  orgAdminStatisticSystemTraffic(orgID, startTime, endTime, groupBy) {
    const url = this.server + '/api/v2.1/org/' + orgID + '/admin/statistics/system-traffic/';
    let params = {
      start: startTime,
      end: endTime,
      group_by: groupBy
    };
    return this.req.get(url, { params: params });
  }

  orgAdminListUserTraffic(orgID, month, page, perPage, orderBy) {
    const url = this.server + '/api/v2.1/org/' + orgID + '/admin/statistics/user-traffic/';
    let params = {
      month: month,
      page: page,
      per_page: perPage,
      order_by: orderBy
    };
    return this.req.get(url, { params: params });
  }

  orgAdminListDevices(orgID, platform, page, per_page) {
    const url = this.server + '/api/v2.1/org/' + orgID + '/admin/devices/';
    let params = {
      platform: platform,
      page: page,
      per_page: per_page
    };
    return this.req.get(url, { params: params });
  }

  orgAdminUnlinkDevice(orgID, platform, deviceID, user, wipeDevice) {
    const url = this.server + '/api/v2.1/org/' + orgID + '/admin/devices/';
    let params = {
      wipe_device: wipeDevice ? 'true' : 'false',
      platform: platform,
      device_id: deviceID,
      user: user
    };
    return this.req.delete(url, { data: params });
  }

  orgAdminListDevicesErrors(orgID, page, per_page) {
    const url = this.server + '/api/v2.1/org/' + orgID + '/admin/devices-errors/';
    let params = {
      page: page,
      per_page: per_page
    };
    return this.req.get(url, { params: params });
  }

  orgAdminClearDeviceErrors(orgID) {
    const url = this.server + '/api/v2.1/org/' + orgID + '/admin/devices-errors/';
    return this.req.delete(url);
  }

  orgAdminListOrgUsers(orgID, isStaff, page, sortBy, sortOrder) {
    const url = this.server + '/api/v2.1/org/' + orgID + '/admin/users/';
    let params = {
      is_staff: isStaff,
      page: page
    };
    if (sortBy) {
      params.order_by = sortBy;
      params.direction = sortOrder;
    }
    return this.req.get(url, { params: params });
  }

  orgAdminSearchUser(orgID, query) {
    const url = this.server + '/api/v2.1/org/' + orgID + '/admin/search-user/';
    let params = {
      query: query,
    };
    return this.req.get(url, { params: params });
  }

  orgAdminGetOrgUserBesharedRepos(orgID, email) {
    const url = this.server + '/api/v2.1/org/' + orgID + '/admin/users/' + encodeURIComponent(email) + '/beshared-repos/';
    return this.req.get(url);
  }

  orgAdminGetOrgUserOwnedRepos(orgID, email) {
    const url = this.server + '/api/v2.1/org/' + orgID + '/admin/users/' + encodeURIComponent(email) + '/repos/';
    return this.req.get(url);
  }

  orgAdminGetOrgUserInfo(orgID, email) {
    const url = this.server + '/api/v2.1/org/' + orgID + '/admin/users/' + encodeURIComponent(email) + '/';
    return this.req.get(url);
  }

  orgAdminSetOrgUserName(orgID, email, name) {
    const url = this.server + '/api/v2.1/org/' + orgID + '/admin/users/' + encodeURIComponent(email) + '/';
    const data = {
      name: name
    };
    return this.req.put(url, data);
  }

  orgAdminSetOrgUserContactEmail(orgID, email, contactEmail) {
    const url = this.server + '/api/v2.1/org/' + orgID + '/admin/users/' + encodeURIComponent(email) + '/';
    const data = {
      contact_email: contactEmail
    };
    return this.req.put(url, data);
  }

  orgAdminSetOrgUserQuota(orgID, email, quota) {
    const url = this.server + '/api/v2.1/org/' + orgID + '/admin/users/' + encodeURIComponent(email) + '/';
    const data = {
      quota_total: quota
    };
    return this.req.put(url, data);
  }

  orgAdminDeleteOrgUser(orgID, email) {
    const url = this.server + '/api/v2.1/org/' + orgID + '/admin/users/' + encodeURIComponent(email) + '/';
    return this.req.delete(url);
  }

  orgAdminResetOrgUserPassword(orgID, email) {
    const url = this.server + '/api/v2.1/org/' + orgID + '/admin/users/' + encodeURIComponent(email) + '/set-password/';
    return this.req.put(url);
  }

  orgAdminChangeOrgUserStatus(orgID, email, isActive) {
    const url = this.server + '/api/v2.1/org/' + orgID + '/admin/users/' + encodeURIComponent(email) + '/';
    let form = new FormData();
    form.append('is_active', isActive);
    return this.req.put(url, form);
  }

  orgAdminAddOrgUser(orgID, email, name, password) {
    const url = this.server + '/api/v2.1/org/' + orgID + '/admin/users/';
    let form = new FormData();
    form.append('email', email);
    form.append('name', name);
    form.append('password', password);
    return this._sendPostRequest(url, form);
  }

  orgAdminImportUsersViaFile(orgID, file) {
    const url = this.server + '/api/v2.1/org/' + orgID + '/admin/import-users/';
    let formData = new FormData();
    formData.append('file', file);
    return this._sendPostRequest(url, formData);
  }

  orgAdminInviteOrgUsers(orgID, email) {
    const url = this.server + '/api/v2.1/org/' + orgID + '/admin/invite-users/';
    let form = new FormData();
    if (Array.isArray(email)) {
      email.forEach(item => {
        form.append('email', item);
      });
    } else {
      form.append('email', email);
    }
    return this._sendPostRequest(url, form);
  }

  orgAdminSetOrgAdmin(orgID, email, isStaff) {
    const url = this.server + '/api/v2.1/org/' + orgID + '/admin/users/' + encodeURIComponent(email) + '/';
    let form = new FormData();
    form.append('is_staff', isStaff);
    return this.req.put(url, form);
  }

  orgAdminListOrgGroups(orgID, page) {
    const url = this.server + '/api/v2.1/org/' + orgID + '/admin/groups/?page=' + page;
    return this.req.get(url);
  }

  orgAdminSearchGroup(orgID, query) {
    const url = this.server + '/api/v2.1/org/' + orgID + '/admin/search-group/';
    let params = {
      query: query,
    };
    return this.req.get(url, { params: params });
  }

  orgAdminGetGroup(orgID, groupID) {
    const url = this.server + '/api/v2.1/org/' + orgID + '/admin/groups/' + groupID + '/';
    return this.req.get(url);
  }

  orgAdminDeleteOrgGroup(orgID, groupID) {
    const url = this.server + '/api/v2.1/org/' + orgID + '/admin/groups/' + groupID + '/';
    return this.req.delete(url);
  }


  orgAdminListDepartments(orgID) {
    const url = this.server + '/api/v2.1/org/' + orgID + '/admin/departments/';
    return this.req.get(url);
  }

  orgAdminListOrgRepos(orgID, page, perPage, orderBy) {
    const url = this.server + '/api/v2.1/org/' + orgID + '/admin/repos/';
    let params = {
      page: page,
      per_page: perPage
    };
    if (orderBy) {
      params.order_by = orderBy;
    }
    return this.req.get(url, { params: params });
  }

  orgAdminDeleteOrgRepo(orgID, repoID) {
    const url = this.server + '/api/v2.1/org/' + orgID + '/admin/repos/' + repoID + '/';
    return this.req.delete(url);
  }

  orgAdminListTrashRepos(orgID, page, perPage) {
    const url = this.server + '/api/v2.1/org/' + orgID + '/admin/trash-libraries/';
    let params = {
      page: page,
      per_page: perPage
    };
    return this.req.get(url, {
      params: params
    });
  }

  orgAdminDeleteTrashRepo(orgID, repoID) {
    const url = this.server + '/api/v2.1/org/' + orgID + '/admin/trash-libraries/' + repoID + '/';
    return this.req.delete(url);
  }

  orgAdminRestoreTrashRepo(orgID, repoID) {
    const url = this.server + '/api/v2.1/org/' + orgID + '/admin/trash-libraries/' + repoID + '/';
    return this.req.put(url);
  }

  orgAdminCleanTrashRepo(orgID) {
    const url = this.server + '/api/v2.1/org/' + orgID + '/admin/trash-libraries/';
    return this.req.delete(url);
  }

  // org links
  orgAdminListOrgLinks(page) {
    const url = this.server + '/api/v2.1/org/admin/links/?page=' + page;
    return this.req.get(url);
  }

  orgAdminDeleteOrgLink(token) {
    const url = this.server + '/api/v2.1/org/admin/links/' + token + '/';
    return this.req.delete(url);
  }

  // org depart group
  orgAdminListDepartGroups(orgID) {
    const url = this.server + '/api/v2.1/org/' + orgID + '/admin/address-book/groups/';
    return this.req.get(url);
  }

  orgAdminListGroupInfo(orgID, groupID, showAncestors) {
    const url = this.server + '/api/v2.1/org/' + orgID + '/admin/address-book/groups/' + groupID + '/?return_ancestors=' + showAncestors;
    return this.req.get(url);
  }

  orgAdminAddDepartGroup(orgID, parentGroup, groupName, groupOwner, groupStaff) {
    const url = this.server + '/api/v2.1/org/' + orgID + '/admin/address-book/groups/';
    let form = new FormData();
    form.append('parent_group', parentGroup);
    form.append('group_name', groupName);
    if (groupOwner) {
      form.append('group_owner', groupOwner);
    }
    if (groupStaff) {
      form.append('group_staff', groupStaff.join(','));
    }
    return this._sendPostRequest(url, form);
  }

  orgAdminUpdateDepartGroup(orgID, groupID, groupName) {
    const url = this.server + '/api/v2.1/org/' + orgID + '/admin/address-book/groups/' + groupID + '/';
    let form = new FormData();
    form.append('group_name', groupName);
    return this.req.put(url, form);
  }

  orgAdminDeleteDepartGroup(orgID, groupID) {
    const url = this.server + '/api/v2.1/org/' + orgID + '/admin/address-book/groups/' + groupID + '/';
    return this.req.delete(url);
  }

  orgAdminSetGroupQuota(orgID, groupID, quota) {
    const url = this.server + '/api/v2.1/org/' + orgID + '/admin/groups/' + groupID + '/';
    let form = new FormData();
    form.append('quota', quota);
    return this.req.put(url, form);
  }

  orgAdminListGroupRepos(orgID, groupID) {
    const url = this.server + '/api/v2.1/org/' + orgID + '/admin/groups/' + groupID + '/libraries/';
    return this.req.get(url);
  }

  orgAdminAddDepartmentRepo(orgID, groupID, repoName) {
    const url = this.server + '/api/v2.1/org/' + orgID + '/admin/groups/' + groupID + '/group-owned-libraries/';
    let form = new FormData();
    form.append('repo_name', repoName);
    return this._sendPostRequest(url, form);
  }

  orgAdminDeleteDepartmentRepo(orgID, groupID, repoID) {
    const url = this.server + '/api/v2.1/org/' + orgID + '/admin/groups/' + groupID + '/group-owned-libraries/' + repoID + '/';
    return this.req.delete(url);
  }

  orgAdminListGroupMembers(orgID, groupID) {
    const url = this.server + '/api/v2.1/org/' + orgID + '/admin/groups/' + groupID + '/members/';
    return this.req.get(url);
  }

  orgAdminDeleteGroupMember(orgID, groupID, userEmail) {
    const url = this.server + '/api/v2.1/org/' + orgID + '/admin/groups/' + groupID + '/members/' + encodeURIComponent(userEmail) + '/';
    return this.req.delete(url);
  }

  orgAdminAddGroupMember(orgID, groupID, emails) {
    const url = this.server + '/api/v2.1/org/' + orgID + '/admin/groups/' + groupID + '/members/';
    let form = new FormData();
    for (let i = 0; i < emails.length; i++) {
      form.append('email', emails[i]);
    }
    return this._sendPostRequest(url, form);
  }

  orgAdminSetGroupMemberRole(orgID, groupID, userEmail, isAdmin) {
    const url = this.server + '/api/v2.1/org/' + orgID + '/admin/groups/' + groupID + '/members/' + encodeURIComponent(userEmail) + '/';
    let form = new FormData();
    form.append('is_admin', isAdmin);
    return this.req.put(url, form);
  }

  // org admin logs
  orgAdminListFileTransfer(page, perPage) {
    let url = this.server + '/api/v2.1/org/admin/logs/repo-transfer/';
    let params = {
      page: page,
      per_page: perPage
    };
    return this.req.get(url, { params: params });
  }

  orgAdminListFileAudit(email, repoID, page) {
    let url = this.server + '/api/v2.1/org/admin/logs/file-access/?page=' + page;
    if (email) {
      url = url + '&email=' + encodeURIComponent(email);
    }
    if (repoID) {
      url = url + '&repo_id=' + repoID;
    }
    return this.req.get(url);
  }

  orgAdminListFileUpdate(email, repoID, page) {
    let url = this.server + '/api/v2.1/org/admin/logs/file-update/?page=' + page;
    if (email) {
      url = url + '&email=' + encodeURIComponent(email);
    }
    if (repoID) {
      url = url + '&repo_id=' + repoID;
    }
    return this.req.get(url);
  }

  orgAdminListPermAudit(email, repoID, page) {
    let url = this.server + '/api/v2.1/org/admin/logs/repo-permission/?page=' + page;
    if (email) {
      url = url + '&email=' + encodeURIComponent(email);
    }
    if (repoID) {
      url = url + '&repo_id=' + repoID;
    }
    return this.req.get(url);
  }

  orgAdminGetFileUpdateDetail(repoID, commitID) {
    let url = this.server + '/ajax/repo/' + repoID + '/history/changes/?commit_id=' + commitID;
    return this.req.get(url, { headers: { 'X-Requested-With': 'XMLHttpRequest' } });
  }

  orgAdminGroup2Department(orgID, groupID) {
    var url = this.server + '/api/v2.1/org/' + orgID + '/admin/groups/' + groupID + '/group-to-department/';
    return this.req.post(url);
  }

  orgAdminExportLogsExcel(orgID, start, end, logType) {
    const url = this.server + '/api/v2.1/org/' + orgID + '/admin/logs/export-excel/';
    const params = {
      start: start,
      end: end,
      logType: logType
    };
    return this.req.get(url, { params: params });
  }

  orgAdminTransferOrgRepo(orgID, repoID, email, reshare) {
    const url = this.server + '/api/v2.1/org/' + orgID + '/admin/repos/' + repoID + '/';
    const form = new FormData();
    form.append('email', email);
    form.append('reshare', reshare);
    return this.req.put(url, form);
  }

}

let orgAdminAPI = new OrgAdminAPI();
let xcsrfHeaders = cookie.load('sfcsrftoken');
orgAdminAPI.initForSeahubUsage({ siteRoot, xcsrfHeaders });

export { orgAdminAPI };
