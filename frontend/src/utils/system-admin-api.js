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

  sysAdminListAbuseReports() {
    let url = this.server + '/api/v2.1/admin/abuse-reports/';
    return this.req.get(url);
  }

  sysAdminUpdateAbuseReport(handled, abuseReportId) {
    const url = this.server + '/api/v2.1/admin/abuse-reports/' + abuseReportId + '/';
    let form = new FormData();
    form.append('handled', handled);
    return this.req.put(url, form);
  }

  sysAdminListFileScanRecords() {
    const url = this.server + '/api/v2.1/admin/file-scan-records/';
    return this.req.get(url);
  }

  sysAdminListWorkWeixinDepartments(departmentID) {
    const url = this.server + '/api/v2.1/admin/work-weixin/departments/';
    const params = {};
    if (departmentID) {
      params.department_id = departmentID;
    }
    return this.req.get(url, { params: params });
  }

  sysAdminListWorkWeixinDepartmentMembers(departmentID, params) {
    const url = this.server + '/api/v2.1/admin/work-weixin/departments/' + departmentID + '/members/';
    return this.req.get(url, { params: params });
  }

  sysAdminAddWorkWeixinUsersBatch(userList) {
    const url = this.server + '/api/v2.1/admin/work-weixin/users/batch/';
    return this.req.post(url, { userlist: userList });
  }

  sysAdminImportWorkWeixinDepartment(departmentID) {
    const url = this.server + '/api/v2.1/admin/work-weixin/departments/import/';
    return this.req.post(url, { work_weixin_department_id: departmentID });
  }

  sysAdminListDingtalkDepartments(departmentID) {
    const url = this.server + '/api/v2.1/admin/dingtalk/departments/';
    const params = {};
    if (departmentID) {
      params.department_id = departmentID;
    }
    return this.req.get(url, { params: params });
  }

  sysAdminListDingtalkDepartmentMembers(departmentID) {
    const url = this.server + '/api/v2.1/admin/dingtalk/departments/' + departmentID + '/members/';
    return this.req.get(url);
  }

  sysAdminAddDingtalkUsersBatch(userList) {
    const url = this.server + '/api/v2.1/admin/dingtalk/users/batch/';
    return this.req.post(url, { userlist: userList });
  }

  sysAdminImportDingtalkDepartment(departmentID) {
    const url = this.server + '/api/v2.1/admin/dingtalk/departments/import/';
    return this.req.post(url, { department_id: departmentID });
  }

  sysAdminUploadLicense(file) {
    const url = this.server + '/api/v2.1/admin/license/';
    let formData = new FormData();
    formData.append('license', file);
    return this._sendPostRequest(url, formData);
  }

  sysAdminGetSysInfo() {
    const url = this.server + '/api/v2.1/admin/sysinfo/';
    return this.req.get(url);
  }

  sysAdminListDevices(platform, page, per_page) {
    const url = this.server + '/api/v2.1/admin/devices/';
    let params = {
      platform: platform,
      page: page,
      per_page: per_page
    };
    return this.req.get(url, { params: params });
  }

  sysAdminUnlinkDevice(platform, deviceID, user, wipeDevice) {
    const url = this.server + '/api/v2.1/admin/devices/';
    let params = {
      wipe_device: wipeDevice ? 'true' : 'false',
      platform: platform,
      device_id: deviceID,
      user: user
    };
    return this.req.delete(url, { data: params });
  }

  sysAdminListDeviceErrors(page, per_page) {
    const url = this.server + '/api/v2.1/admin/device-errors/';
    let params = {
      page: page,
      per_page: per_page
    };
    return this.req.get(url, { params: params });
  }

  sysAdminClearDeviceErrors() {
    const url = this.server + '/api/v2.1/admin/device-errors/';
    return this.req.delete(url);
  }

  sysAdminGetSysSettingInfo() {
    const url = this.server + '/api/v2.1/admin/web-settings/';
    return this.req.get(url);
  }

  sysAdminSetSysSettingInfo(key, value) {
    const url = this.server + '/api/v2.1/admin/web-settings/';
    let formData = new FormData();
    formData.append(key, value);
    return this.req.put(url, formData);
  }

  sysAdminUpdateLogo(file) {
    const url = this.server + '/api/v2.1/admin/logo/';
    let formData = new FormData();
    formData.append('logo', file);
    return this._sendPostRequest(url, formData);
  }

  sysAdminUpdateFavicon(file) {
    const url = this.server + '/api/v2.1/admin/favicon/';
    let formData = new FormData();
    formData.append('favicon', file);
    return this._sendPostRequest(url, formData);
  }

  sysAdminUpdateLoginBG(file) {
    const url = this.server + '/api/v2.1/admin/login-background-image/';
    let formData = new FormData();
    formData.append('login_bg_image', file);
    return this._sendPostRequest(url, formData);
  }

  sysAdminListAllRepos(page, perPage, orderBy) {
    const url = this.server + '/api/v2.1/admin/libraries/';
    let params = {
      page: page,
      per_page: perPage
    };
    if (orderBy) {
      params.order_by = orderBy;
    }
    return this.req.get(url, { params: params });
  }

  sysAdminListAllWikis(page, perPage, orderBy) {
    const url = this.server + '/api/v2.1/admin/wikis/';
    let params = {
      page: page,
      per_page: perPage
    };
    if (orderBy) {
      params.order_by = orderBy;
    }
    return this.req.get(url, { params: params });
  }

  sysAdminSearchRepos(name, page, perPage) {
    const url = this.server + '/api/v2.1/admin/search-library/';
    let params = {
      query: name || '',
      page: page,
      per_page: perPage
    };
    return this.req.get(url, { params: params });
  }

  sysAdminGetSystemRepoInfo() {
    const url = this.server + '/api/v2.1/admin/system-library/';
    return this.req.get(url);
  }

  sysAdminDeleteRepo(repoID) {
    const url = this.server + '/api/v2.1/admin/libraries/' + repoID + '/';
    return this.req.delete(url);
  }

  sysAdminTransferRepo(repoID, userEmail, reshare) {
    const url = this.server + '/api/v2.1/admin/libraries/' + repoID + '/';
    const params = {
      owner: userEmail,
      reshare: reshare,
    };
    return this.req.put(url, params);
  }

  sysAdminGetRepoHistorySetting(repoID) {
    const url = this.server + '/api/v2.1/admin/libraries/' + repoID + '/history-limit/';
    return this.req.get(url);
  }

  sysAdminUpdateRepoHistorySetting(repoID, keepDays) {
    const url = this.server + '/api/v2.1/admin/libraries/' + repoID + '/history-limit/';
    let form = new FormData();
    form.append('keep_days', keepDays);
    return this.req.put(url, form);
  }

  sysAdminListRepoSharedItems(repoID, shareType) {
    const url = this.server + '/api/v2.1/admin/shares/';
    const params = {
      repo_id: repoID,
      share_type: shareType
    };
    return this.req.get(url, { params: params });
  }

  sysAdminUpdateRepoSharedItemPermission(repoID, shareType, shareTo, permission) {
    const url = this.server + '/api/v2.1/admin/shares/';
    const params = {
      repo_id: repoID,
      share_type: shareType,
      permission: permission,
      share_to: shareTo
    };
    return this.req.put(url, params);
  }

  sysAdminAddRepoSharedItem(repoID, shareType, shareToList, permission) {
    const url = this.server + '/api/v2.1/admin/shares/';
    let form = new FormData();
    form.append('repo_id', repoID);
    form.append('share_type', shareType);
    form.append('permission', permission);
    shareToList.forEach((shareTo) => {
      form.append('share_to', shareTo);
    });
    return this._sendPostRequest(url, form);
  }

  sysAdminDeleteRepoSharedItem(repoID, shareType, shareTo) {
    const url = this.server + '/api/v2.1/admin/shares/';
    const params = {
      repo_id: repoID,
      share_type: shareType,
      share_to: shareTo
    };
    return this.req.delete(url, { data: params });
  }

  sysAdminCreateRepo(repoName, owner) {
    const url = this.server + '/api/v2.1/admin/libraries/';
    let form = new FormData();
    form.append('name', repoName);
    form.append('owner', owner);
    return this._sendPostRequest(url, form);
  }

  sysAdminListTrashRepos(page, perPage) {
    const url = this.server + '/api/v2.1/admin/trash-libraries/';
    let params = {
      page: page,
      per_page: perPage
    };
    return this.req.get(url, { params: params });
  }

  sysAdminSearchTrashRepos(owner) {
    const url = this.server + '/api/v2.1/admin/trash-libraries/';
    let params = {
      owner: owner || ''
    };
    return this.req.get(url, { params: params });
  }

  sysAdminDeleteTrashRepo(repoID) {
    const url = this.server + '/api/v2.1/admin/trash-libraries/' + repoID + '/';
    return this.req.delete(url);
  }

  sysAdminRestoreTrashRepo(repoID) {
    const url = this.server + '/api/v2.1/admin/trash-libraries/' + repoID + '/';
    return this.req.put(url);
  }

  sysAdminCleanTrashRepos() {
    const url = this.server + '/api/v2.1/admin/trash-libraries/';
    return this.req.delete(url);
  }

  sysAdminListRepoDirents(repoID, dir) {
    const url = this.server + '/api/v2.1/admin/libraries/' + repoID + '/dirents/';
    let params = {
      parent_dir: dir
    };
    return this.req.get(url, { params: params });
  }

  sysAdminDeleteRepoDirent(repoID, path) {
    const url = this.server + '/api/v2.1/admin/libraries/' + repoID + '/dirent/';
    let params = {
      path: path
    };
    return this.req.delete(url, { params: params });
  }

  sysAdminGetRepoFileDownloadURL(repoID, path) {
    const url = this.server + '/api/v2.1/admin/libraries/' + repoID + '/dirent/';
    let params = {
      path: path,
      dl: 1
    };
    return this.req.get(url, { params: params });
  }

  sysAdminGetSysRepoItemUploadURL(path) {
    const url = this.server + '/api/v2.1/admin/system-library/upload-link/?from=web';
    let params = {
      path: path
    };
    return this.req.get(url, { params: params });
  }

  sysAdminGetSysRepoItemInfo(repoID, path) {
    const url = this.server + '/api/v2.1/admin/libraries/' + repoID + '/dirent/';
    let params = {
      path: path
    };
    return this.req.get(url, { params: params });
  }

  sysAdminCreateSysRepoFolder(repoID, path, name) {
    const url = this.server + '/api/v2.1/admin/libraries/' + repoID + '/dirents/?parent_dir=' + encodeURIComponent(path);
    let form = new FormData();
    form.append('obj_name', name);
    return this._sendPostRequest(url, form);
  }

  sysAdminListAllGroups(page, perPage) {
    const url = this.server + '/api/v2.1/admin/groups/';
    let params = {
      page: page,
      per_page: perPage
    };
    return this.req.get(url, { params: params });
  }

  sysAdminSearchGroups(name) {
    const url = this.server + '/api/v2.1/admin/search-group/';
    let params = {
      query: name
    };
    return this.req.get(url, { params: params });
  }

  sysAdminDismissGroupByID(groupID) {
    const url = this.server + '/api/v2.1/admin/groups/' + groupID + '/';
    return this.req.delete(url);
  }

  sysAdminTransferGroup(receiverEmail, groupID) {
    const url = this.server + '/api/v2.1/admin/groups/' + groupID + '/';
    let formData = new FormData();
    formData.append('new_owner', receiverEmail);
    return this.req.put(url, formData);
  }

  sysAdminCreateNewGroup(groupName, ownerEmail) {
    const url = this.server + '/api/v2.1/admin/groups/';
    let formData = new FormData();
    formData.append('group_name', groupName);
    formData.append('group_owner', ownerEmail);
    return this._sendPostRequest(url, formData);
  }

  sysAdminListGroupRepos(groupID) {
    const url = this.server + '/api/v2.1/admin/groups/' + groupID + '/libraries/';
    return this.req.get(url);
  }

  sysAdminListGroupMembers(groupID, page, perPage) {
    const url = this.server + '/api/v2.1/admin/groups/' + groupID + '/members/';
    let params = {
      page: page,
      per_page: perPage
    };
    return this.req.get(url, { params: params });
  }

  sysAdminUnshareRepoFromGroup(groupID, repoID) {
    const url = this.server + '/api/v2.1/admin/groups/' + groupID + '/libraries/' + repoID + '/';
    return this.req.delete(url);
  }

  sysAdminAddGroupMember(groupID, emails) {
    const url = this.server + '/api/v2.1/admin/groups/' + groupID + '/members/';
    let form = new FormData();
    for (let i = 0; i < emails.length; i++) {
      form.append('email', emails[i]);
    }
    return this._sendPostRequest(url, form);
  }

  sysAdminDeleteGroupMember(groupID, email) {
    const url = this.server + '/api/v2.1/admin/groups/' + groupID + '/members/' + encodeURIComponent(email) + '/';
    return this.req.delete(url);
  }

  sysAdminUpdateGroupMemberRole(groupID, email, isAdmin) {
    const url = this.server + '/api/v2.1/admin/groups/' + groupID + '/members/' + encodeURIComponent(email) + '/';
    let formData = new FormData();
    formData.append('is_admin', isAdmin);
    return this.req.put(url, formData);
  }

  sysAdminGroup2Department(groupID) {
    const url = this.server + '/api/v2.1/admin/groups/' + groupID + '/group-to-department/';
    return this.req.post(url);
  }

  sysAdminListAllSysNotifications() {
    const url = this.server + '/api/v2.1/admin/sys-notifications/';
    return this.req.get(url);
  }

  sysAdminAddSysNotification(msg) {
    const url = this.server + '/api/v2.1/admin/sys-notifications/';
    let formData = new FormData();
    formData.append('msg', msg);
    return this._sendPostRequest(url, formData);
  }

  sysAdminSetSysNotificationToCurrent(nid) {
    const url = this.server + '/api/v2.1/admin/sys-notifications/' + nid + '/';
    return this.req.put(url);
  }

  sysAdminDeleteSysNotification(nid) {
    const url = this.server + '/api/v2.1/admin/sys-notifications/' + nid + '/';
    return this.req.delete(url);
  }

  sysAdminListAllDepartments() {
    const url = this.server + '/api/v2.1/admin/address-book/groups/';
    return this.req.get(url);
  }

  sysAdminAddNewDepartment(parentGroupID, groupName) {
    const url = this.server + '/api/v2.1/admin/address-book/groups/';
    let formData = new FormData();
    formData.append('parent_group', parentGroupID);
    formData.append('group_name', groupName);
    formData.append('group_owner', 'system admin');
    return this._sendPostRequest(url, formData);
  }

  sysAdminGetDepartmentInfo(groupID, showAncestors) {
    let url = this.server + '/api/v2.1/admin/address-book/groups/' + groupID + '/';
    url += showAncestors ? '?return_ancestors=true' : '';
    return this.req.get(url);
  }

  sysAdminUpdateDepartmentQuota(groupID, quota) {
    const url = this.server + '/api/v2.1/admin/groups/' + groupID + '/';
    let formData = new FormData();
    formData.append('quota', quota);
    return this.req.put(url, formData);
  }

  sysAdminRenameDepartment(groupID, groupName) {
    const url = this.server + '/api/v2.1/admin/groups/' + groupID + '/';
    let formData = new FormData();
    formData.append('name', groupName);
    return this.req.put(url, formData);
  }

  sysAdminMoveDepartment(groupID, targetGroupID) {
    const url = this.server + '/api/v2.1/admin/groups/' + groupID + '/';
    let formData = new FormData();
    formData.append('target_group_id', targetGroupID);
    return this.req.put(url, formData);
  }

  sysAdminDeleteDepartment(groupID) {
    const url = this.server + '/api/v2.1/admin/address-book/groups/' + groupID + '/';
    return this.req.delete(url);
  }

  sysAdminAddRepoInDepartment(groupID, repoName) {
    const url = this.server + '/api/v2.1/admin/groups/' + groupID + '/group-owned-libraries/';
    let formData = new FormData();
    formData.append('repo_name', repoName);
    return this._sendPostRequest(url, formData);
  }

  sysAdminDeleteRepoInDepartment(groupID, repoID) {
    const url = this.server + '/api/v2.1/admin/groups/' + groupID + '/group-owned-libraries/' + repoID + '/';
    return this.req.delete(url);
  }

  sysAdminListShareLinks(page, perPage, sortBy, sortOrder) {
    const url = this.server + '/api/v2.1/admin/share-links/';
    let params = {
      page: page,
      per_page: perPage
    };
    if (sortBy) {
      params.order_by = sortBy;
      params.direction = sortOrder;
    }
    return this.req.get(url, { params: params });
  }

  sysAdminDeleteShareLink(token) {
    const url = this.server + '/api/v2.1/admin/share-links/' + token + '/';
    return this.req.delete(url);
  }

  sysAdminListAllUploadLinks(page, perPage) {
    const url = this.server + '/api/v2.1/admin/upload-links/';
    let params = {
      page: page,
      per_page: perPage
    };
    return this.req.get(url, { params: params });
  }

  sysAdminDeleteUploadLink(token) {
    const url = this.server + '/api/v2.1/admin/upload-links/' + token + '/';
    return this.req.delete(url);
  }

  sysAdminListOrgs(page, perPage) {
    const url = this.server + '/api/v2.1/admin/organizations/';
    let params = {
      page: page,
      per_page: perPage
    };
    return this.req.get(url, { params: params });
  }

  sysAdminListTrafficExceedOrgs(page, perPage) {
    const url = this.server + '/api/v2.1/admin/organizations/traffic-exceeded/';
    let params = {
      page: page,
      per_page: perPage
    };
    return this.req.get(url, { params: params });
  }

  sysAdminSearchOrgs(name) {
    let url = this.server + '/api/v2.1/admin/search-organization/';
    let params = {
      query: name
    };
    return this.req.get(url, { params: params });
  }

  sysAdminGetOrg(orgID) {
    const url = this.server + '/api/v2.1/admin/organizations/' + orgID + '/';
    return this.req.get(url);
  }

  sysAdminUpdateOrg(orgID, orgInfo) {
    const url = this.server + '/api/v2.1/admin/organizations/' + orgID + '/';
    let formData = new FormData();
    if (orgInfo.orgName) {
      formData.append('org_name', orgInfo.orgName);
    }
    if (orgInfo.maxUserNumber) {
      formData.append('max_user_number', orgInfo.maxUserNumber);
    }
    if (orgInfo.quota) {
      formData.append('quota', orgInfo.quota);
    }
    if (orgInfo.role) {
      formData.append('role', orgInfo.role);
    }
    if (orgInfo.isActive != undefined) {
      formData.append('is_active', orgInfo.isActive);
    }
    return this.req.put(url, formData);
  }

  sysAdminAddOrg(orgName, ownerEmail, owner_password) {
    const url = this.server + '/api/v2.1/admin/organizations/';
    let formData = new FormData();
    formData.append('org_name', orgName);
    formData.append('owner_email', ownerEmail);
    formData.append('owner_password', owner_password);
    return this._sendPostRequest(url, formData);
  }

  sysAdminDeleteOrg(orgID) {
    const url = this.server + '/api/v2.1/admin/organizations/' + orgID + '/';
    return this.req.delete(url);
  }

  sysAdminListOrgUsers(orgID) {
    const url = this.server + '/api/v2.1/admin/organizations/' + orgID + '/users/';
    return this.req.get(url);
  }

  sysAdminListOrgStaff(orgID) {
    const url = this.server + '/api/v2.1/admin/organizations/' + orgID + '/staff/';
    return this.req.get(url);
  }

  sysAdminAddOrgUser(orgID, email, name, password) {
    const url = this.server + '/api/v2.1/admin/organizations/' + orgID + '/users/';
    let formData = new FormData();
    formData.append('email', email);
    formData.append('name', name);
    formData.append('password', password);
    return this._sendPostRequest(url, formData);
  }

  sysAdminUpdateOrgUser(orgID, email, attribute, value, options = {}) {
    const url = this.server + '/api/v2.1/admin/organizations/' + orgID + '/users/' + encodeURIComponent(email) + '/';
    let formData = new FormData();
    switch (attribute) {
      case 'active':
        formData.append('active', value);
        if (options.keepSharing !== undefined) {
          formData.append('keep_sharing', options.keepSharing);
        }
        break;
      case 'is_org_staff':
        formData.append('is_org_staff', value);
        break;
      case 'name':
        formData.append('name', value);
        break;
      case 'contact_email':
        formData.append('contact_email', value);
        break;
      case 'quota_total':
        formData.append('quota_total', value);
        break;
    }
    return this.req.put(url, formData);
  }

  sysAdminDeleteOrgUser(orgID, email) {
    const url = this.server + '/api/v2.1/admin/organizations/' + orgID + '/users/' + encodeURIComponent(email) + '/';
    return this.req.delete(url);
  }

  sysAdminListOrgGroups(orgID) {
    const url = this.server + '/api/v2.1/admin/organizations/' + orgID + '/groups/';
    return this.req.get(url);
  }

  sysAdminListOrgRepos(orgID) {
    const url = this.server + '/api/v2.1/admin/organizations/' + orgID + '/repos/';
    return this.req.get(url);
  }

  sysAdminListLoginLogs(page, perPage, options = {}) {
    const url = this.server + '/api/v2.1/admin/logs/login-logs/';
    let params = {
      page: page,
      per_page: perPage,
      ...options
    };
    return this.req.get(url, {
      params: params,
      paramsSerializer: {
        serialize: function (params) {
          let list = [];
          for (let key in params) {
            if (Array.isArray(params[key])) {
              for (let i = 0, len = params[key].length; i < len; i++) {
                list.push(key + '=' + encodeURIComponent(params[key][i]));
              }
            } else {
              list.push(key + '=' + encodeURIComponent(params[key]));
            }
          }
          return list.join('&');
        }
      }
    });
  }

  sysAdminListFileAccessLogs(page, perPage, options = {}) {
    const url = this.server + '/api/v2.1/admin/logs/file-access-logs/';
    let params = {
      page: page,
      per_page: perPage,
      ...options
    };
    return this.req.get(url, {
      params: params,
      paramsSerializer: {
        serialize: function (params) {
          let list = [];
          for (let key in params) {
            if (Array.isArray(params[key])) {
              for (let i = 0, len = params[key].length; i < len; i++) {
                list.push(key + '=' + encodeURIComponent(params[key][i]));
              }
            } else {
              list.push(key + '=' + encodeURIComponent(params[key]));
            }
          }
          return list.join('&');
        }
      }
    });
  }

  sysAdminListFileUpdateLogs(page, perPage, options = {}) {
    const url = this.server + '/api/v2.1/admin/logs/file-update-logs/';
    let params = {
      page: page,
      per_page: perPage,
      ...options
    };
    return this.req.get(url, {
      params: params,
      paramsSerializer: {
        serialize: function (params) {
          let list = [];
          for (let key in params) {
            if (Array.isArray(params[key])) {
              for (let i = 0, len = params[key].length; i < len; i++) {
                list.push(key + '=' + encodeURIComponent(params[key][i]));
              }
            } else {
              list.push(key + '=' + encodeURIComponent(params[key]));
            }
          }
          return list.join('&');
        }
      }
    });
  }

  sysAdminListSharePermissionLogs(page, perPage, options = {}) {
    const url = this.server + '/api/v2.1/admin/logs/share-permission-logs/';
    let params = {
      page: page,
      per_page: perPage,
      ...options
    };
    return this.req.get(url, {
      params: params,
      paramsSerializer: {
        serialize: function (params) {
          let list = [];
          for (let key in params) {
            if (Array.isArray(params[key])) {
              for (let i = 0, len = params[key].length; i < len; i++) {
                list.push(key + '=' + encodeURIComponent(params[key][i]));
              }
            } else {
              list.push(key + '=' + encodeURIComponent(params[key]));
            }
          }
          return list.join('&');
        }
      }
    });
  }

  sysAdminListFileTransferLogs(page, perPage, options = {}) {
    const url = this.server + '/api/v2.1/admin/logs/repo-transfer-logs/';
    let params = {
      page: page,
      per_page: perPage,
      ...options
    };
    return this.req.get(url, {
      params: params,
      paramsSerializer: {
        serialize: function (params) {
          let list = [];
          for (let key in params) {
            if (Array.isArray(params[key])) {
              for (let i = 0, len = params[key].length; i < len; i++) {
                list.push(key + '=' + encodeURIComponent(params[key][i]));
              }
            } else {
              list.push(key + '=' + encodeURIComponent(params[key]));
            }
          }
          return list.join('&');
        }
      }
    });
  }

  sysAdminListGroupInviteLogs(page, perPage, options = {}) {
    const url = this.server + '/api/v2.1/admin/logs/group-member-audit/';
    let params = {
      page: page,
      per_page: perPage,
      ...options
    };
    return this.req.get(url, {
      params: params,
      paramsSerializer: {
        serialize: function (params) {
          let list = [];
          for (let key in params) {
            if (Array.isArray(params[key])) {
              for (let i = 0, len = params[key].length; i < len; i++) {
                list.push(key + '=' + encodeURIComponent(params[key][i]));
              }
            } else {
              list.push(key + '=' + encodeURIComponent(params[key]));
            }
          }
          return list.join('&');
        }
      }
    });
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

  sysAdminListAdminLogs(page, perPage) {
    const url = this.server + '/api/v2.1/admin/admin-logs/';
    let params = {
      page: page,
      per_page: perPage
    };
    return this.req.get(url, { params: params });
  }


  sysAdminListAdminLoginLogs(page, perPage) {
    const url = this.server + '/api/v2.1/admin/admin-login-logs/';
    let params = {
      page: page,
      per_page: perPage
    };
    return this.req.get(url, { params: params });
  }

  sysAdminListShareInRepos(receiverEmail) {
    const url = this.server + '/api/v2.1/admin/users/' + encodeURIComponent(receiverEmail) + '/beshared-repos/';
    return this.req.get(url);
  }

  sysAdminListShareLinksByUser(email) {
    const url = this.server + '/api/v2.1/admin/users/' + encodeURIComponent(email) + '/share-links/';
    return this.req.get(url);
  }

  sysAdminListUploadLinksByUser(email) {
    const url = this.server + '/api/v2.1/admin/users/' + encodeURIComponent(email) + '/upload-links/';
    return this.req.get(url);
  }

  sysAdminListGroupsJoinedByUser(email) {
    const url = this.server + '/api/v2.1/admin/users/' + encodeURIComponent(email) + '/groups/';
    return this.req.get(url);
  }

  sysAdminSetForceTwoFactorAuth(email, isForce2FA) {
    let isForce = isForce2FA ? 1 : 0;
    const url = this.server + '/api2/two-factor-auth/' + encodeURIComponent(email) + '/';
    let formData = new FormData();
    formData.append('force_2fa', isForce);
    return this.req.put(url, formData);
  }

  sysAdminDeleteTwoFactorAuth(email) {
    const url = this.server + '/api2/two-factor-auth/' + encodeURIComponent(email) + '/';
    return this.req.delete(url);
  }

  sysAdminListUsers(page, perPage, isLDAPImported, sortBy, sortOrder, is_active, role) {
    let url = this.server + '/api/v2.1/admin/users/';
    let params = {
      page: page,
      per_page: perPage
    };
    if (isLDAPImported) {
      params.source = 'LDAPImport';
    }
    if (sortBy) {
      params.order_by = sortBy;
      params.direction = sortOrder;
    }
    if (is_active) {
      params.is_active = is_active;
    }
    if (role) {
      params.role = role;
    }
    return this.req.get(url, { params: params });
  }

  sysAdminSearchUsers(query, page, perPage) {
    let url = this.server + '/api/v2.1/admin/search-user/';
    let params = {
      query: query,
      page: page,
      per_page: perPage
    };
    return this.req.get(url, { params: params });
  }

  sysAdminListLDAPUsers(page, perPage) {
    const url = this.server + '/api/v2.1/admin/ldap-users/';
    let params = {
      page: page,
      per_page: perPage
    };
    return this.req.get(url, { params: params });
  }

  sysAdminAddUser(email, name, role, password) {
    const url = this.server + '/api/v2.1/admin/users/';
    let formData = new FormData();
    formData.append('email', email);
    formData.append('name', name);
    formData.append('password', password);
    if (role) {
      formData.append('role', role);
    }
    return this._sendPostRequest(url, formData);
  }

  sysAdminUpdateUser(email, attribute, value, options = {}) {
    const url = this.server + '/api/v2.1/admin/users/' + encodeURIComponent(email) + '/';
    let formData = new FormData();
    switch (attribute) {
      case 'password':
        formData.append('password', value);
        break;
      case 'is_active':
        formData.append('is_active', value);
        if (options.keep_sharing !== undefined) {
          formData.append('keep_sharing', options.keep_sharing);
        }
        break;
      case 'is_staff':
        formData.append('is_staff', value);
        break;
      case 'role':
        formData.append('role', value);
        break;
      case 'name':
        formData.append('name', value);
        break;
      case 'login_id':
        formData.append('login_id', value);
        break;
      case 'contact_email':
        formData.append('contact_email', value);
        break;
      case 'reference_id':
        formData.append('reference_id', value);
        break;
      case 'department':
        formData.append('department', value);
        break;
      case 'quota_total':
        formData.append('quota_total', value);
        break;
      case 'institution':
        formData.append('institution', value);
        break;
      case 'upload_rate_limit':
        formData.append('upload_rate_limit', value);
        break;
      case 'download_rate_limit':
        formData.append('download_rate_limit', value);
        break;
    }
    return this.req.put(url, formData);
  }

  sysAdminDeleteUser(email) {
    const url = this.server + '/api/v2.1/admin/users/' + encodeURIComponent(email) + '/';
    return this.req.delete(url);
  }

  sysAdminGetUser(email) {
    const url = this.server + '/api/v2.1/admin/users/' + encodeURIComponent(email) + '/';
    return this.req.get(url);
  }

  sysAdminResetUserPassword(email) {
    const url = this.server + '/api/v2.1/admin/users/' + encodeURIComponent(email) + '/reset-password/';
    return this.req.put(url);
  }

  sysAdminSetUserQuotaInBatch(emails, quotaTotal) {
    const url = this.server + '/api/v2.1/admin/users/batch/';
    let formData = new FormData();
    emails.forEach(email => {
      formData.append('email', email);
    });
    formData.append('operation', 'set-quota');
    formData.append('quota_total', quotaTotal);
    return this._sendPostRequest(url, formData);
  }

  sysAdminDeleteUserInBatch(emails) {
    const url = this.server + '/api/v2.1/admin/users/batch/';
    let formData = new FormData();
    emails.forEach(email => {
      formData.append('email', email);
    });
    formData.append('operation', 'delete-user');
    return this._sendPostRequest(url, formData);
  }

  sysAdminImportUserViaFile(file) {
    const url = this.server + '/api/v2.1/admin/import-users/';
    let formData = new FormData();
    formData.append('file', file);
    return this._sendPostRequest(url, formData);
  }

  sysAdminListAdmins() {
    const url = this.server + '/api/v2.1/admin/admin-users/';
    return this.req.get(url);
  }

  sysAdminUpdateAdminRole(email, role) {
    const url = this.server + '/api/v2.1/admin/admin-role/';
    let formData = new FormData();
    formData.append('email', email);
    formData.append('role', role);
    return this.req.put(url, formData);
  }

  sysAdminAddAdminInBatch(emails) {
    const url = this.server + '/api/v2.1/admin/admin-users/batch/';
    let formData = new FormData();
    emails.forEach(email => {
      formData.append('email', email);
    });
    return this._sendPostRequest(url, formData);
  }

  sysAdminListReposByOwner(email) {
    const url = this.server + '/api/v2.1/admin/libraries/';
    let params = {
      owner: email
    };
    return this.req.get(url, { params: params });
  }

  sysAdminListInvitations(page, perPage) {
    const url = this.server + '/api/v2.1/admin/invitations/';
    let params = {
      page: page,
      per_page: perPage
    };
    return this.req.get(url, { params: params });
  }

  sysAdminDeleteInvitation(token) {
    const url = this.server + '/api/v2.1/admin/invitations/' + token + '/';
    return this.req.delete(url);
  }

  sysAdminDeleteExpiredInvitations() {
    const url = this.server + '/api/v2.1/admin/invitations/?type=expired';
    return this.req.delete(url);
  }

  sysAdminListInstitutions(page, perPage) {
    const url = this.server + '/api/v2.1/admin/institutions/';
    let params = {
      page: page,
      per_page: perPage
    };
    return this.req.get(url, { params: params });
  }

  sysAdminAddInstitution(name) {
    const url = this.server + '/api/v2.1/admin/institutions/';
    let formData = new FormData();
    formData.append('name', name);
    return this._sendPostRequest(url, formData);
  }

  sysAdminDeleteInstitution(institutionID) {
    const url = this.server + '/api/v2.1/admin/institutions/' + institutionID + '/';
    return this.req.delete(url);
  }

  sysAdminGetInstitution(institutionID) {
    const url = this.server + '/api/v2.1/admin/institutions/' + institutionID + '/';
    return this.req.get(url);
  }

  sysAdminUpdateInstitution(institutionID, quota) {
    const url = this.server + '/api/v2.1/admin/institutions/' + institutionID + '/';
    let formData = new FormData();
    formData.append('quota', quota);
    return this.req.put(url, formData);
  }

  sysAdminListInstitutionUsers(institutionID, page, perPage) {
    const url = this.server + '/api/v2.1/admin/institutions/' + institutionID + '/users/';
    let params = {
      page: page,
      per_page: perPage
    };
    return this.req.get(url, { params: params });
  }

  sysAdminListInstitutionAdmins(institutionID) {
    const url = this.server + '/api/v2.1/admin/institutions/' + institutionID + '/users/';
    let params = {
      is_institution_admin: true,
    };
    return this.req.get(url, { params: params });
  }

  sysAdminAddInstitutionUserBatch(institutionID, emailArray) {
    const url = this.server + '/api/v2.1/admin/institutions/' + institutionID + '/users/';
    let formData = new FormData();
    emailArray.forEach(email => {
      formData.append('email', email);
    });
    return this.req.post(url, formData);
  }

  sysAdminUpdateInstitutionUser(institutionID, email, isInstitutionAdmin) {
    const url = this.server + '/api/v2.1/admin/institutions/' + institutionID + '/users/' + encodeURIComponent(email) + '/';
    let formData = new FormData();
    formData.append('is_institution_admin', isInstitutionAdmin);
    return this.req.put(url, formData);
  }

  sysAdminDeleteInstitutionUser(institutionID, email) {
    const url = this.server + '/api/v2.1/admin/institutions/' + institutionID + '/users/' + encodeURIComponent(email) + '/';
    return this.req.delete(url);
  }

  sysAdminListDepartments() {
    const url = this.server + '/api/v2.1/admin/departments/';
    return this.req.get(url);
  }

  sysAdminListTermsAndConditions() {
    const url = this.server + '/api/v2.1/admin/terms-and-conditions/';
    return this.req.get(url);
  }

  sysAdminAddTermAndCondition(name, versionNumber, text, isActive) {
    const url = this.server + '/api/v2.1/admin/terms-and-conditions/';
    let formData = new FormData();
    formData.append('name', name);
    formData.append('version_number', versionNumber);
    formData.append('text', text);
    formData.append('is_active', isActive);
    return this._sendPostRequest(url, formData);
  }

  sysAdminUpdateTermAndCondition(termID, name, versionNumber, text, isActive) {
    const url = this.server + '/api/v2.1/admin/terms-and-conditions/' + termID + '/';
    let formData = new FormData();
    formData.append('name', name);
    formData.append('version_number', versionNumber);
    formData.append('text', text);
    formData.append('is_active', isActive);
    return this.req.put(url, formData);
  }

  sysAdminDeleteTermAndCondition(termID) {
    const url = this.server + '/api/v2.1/admin/terms-and-conditions/' + termID + '/';
    return this.req.delete(url);
  }

  sysAdminListVirusFiles(page, perPage, hasHandled) {
    const url = this.server + '/api/v2.1/admin/virus-files/';
    let params = {
      page: page,
      per_page: perPage
    };
    if (hasHandled != undefined) {
      params.has_handled = hasHandled;
    }
    return this.req.get(url, { params: params });
  }

  sysAdminDeleteVirusFile(virusID) {
    const url = this.server + '/api/v2.1/admin/virus-files/' + virusID + '/';
    return this.req.delete(url);
  }

  sysAdminToggleIgnoreVirusFile(virusID, ignore) {
    const url = this.server + '/api/v2.1/admin/virus-files/' + virusID + '/';
    let formData = new FormData();
    formData.append('ignore', ignore);
    return this.req.put(url, formData);
  }

  sysAdminBatchProcessVirusFiles(virusIDs, operation) {
    const url = this.server + '/api/v2.1/admin/virus-files/batch/';
    let formData = new FormData();
    for (let i = 0; i < virusIDs.length; i++) {
      formData.append('virus_ids', virusIDs[i]);
    }
    formData.append('operation', operation);
    return this.req.post(url, formData);
  }

  sysAdminStatisticMetrics() {
    const url = this.server + '/api/v2.1/admin/statistics/system-metrics/';
    return this.req.get(url);
  }

  sysAdminStatisticFiles(startTime, endTime, groupBy) {
    const url = this.server + '/api/v2.1/admin/statistics/file-operations/';
    let params = {
      start: startTime,
      end: endTime,
      group_by: groupBy
    };
    return this.req.get(url, { params: params });
  }

  sysAdminStatisticStorages(startTime, endTime, groupBy) {
    const url = this.server + '/api/v2.1/admin/statistics/total-storage/';
    let params = {
      start: startTime,
      end: endTime,
      group_by: groupBy
    };
    return this.req.get(url, { params: params });
  }

  sysAdminStatisticActiveUsers(startTime, endTime, groupBy) {
    const url = this.server + '/api/v2.1/admin/statistics/active-users/';
    let params = {
      start: startTime,
      end: endTime,
      group_by: groupBy
    };
    return this.req.get(url, { params: params });
  }

  sysAdminStatisticTraffic(startTime, endTime, groupBy) {
    const url = this.server + '/api/v2.1/admin/statistics/system-traffic/';
    let params = {
      start: startTime,
      end: endTime,
      group_by: groupBy
    };
    return this.req.get(url, { params: params });
  }

  sysAdminListUserTraffic(month, page, perPage, orderBy) {
    const url = this.server + '/api/v2.1/admin/statistics/system-user-traffic/';
    let params = {
      month: month,
      page: page,
      per_page: perPage,
      order_by: orderBy
    };
    return this.req.get(url, { params: params });
  }

  sysAdminListOrgTraffic(month, page, perPage, orderBy) {
    const url = this.server + '/api/v2.1/admin/statistics/system-org-traffic/';
    let params = {
      month: month,
      page: page,
      per_page: perPage,
      order_by: orderBy
    };
    return this.req.get(url, { params: params });
  }


}

let systemAdminAPI = new SystemAdminAPI();
let xcsrfHeaders = cookie.load('sfcsrftoken');
systemAdminAPI.initForSeahubUsage({ siteRoot, xcsrfHeaders });

export { systemAdminAPI };
