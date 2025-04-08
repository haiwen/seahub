import axios from 'axios';
import FormData from 'form-data';
import cookie from 'react-cookies';
import { siteRoot } from './constants';

class SeafileAPI {

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

  getAuthTokenBySession() {
    const url = this.server + '/api/v2.1/auth-token-by-session/';
    return this.req.get(url);
  }

  createAuthTokenBySession() {
    const url = this.server + '/api/v2.1/auth-token-by-session/';
    return this.req.post(url);
  }

  deleteAuthTokenBySession() {
    const url = this.server + '/api/v2.1/auth-token-by-session/';
    return this.req.delete(url);
  }

  /**
   * Login to server and create axios instance for future usage
   */
  login() {
    const url = this.server + '/api2/auth-token/';
    return axios.post(url, {
      username: this.username,
      password: this.password
    }).then((response) => {
      this.token = response.data.token;
      this.req = axios.create({
        baseURL: this.server,
        headers: { 'Authorization': 'Token ' + this.token }
      });
    });
  }

  authPing() {
    const url = this.server + '/api2/auth/ping/';
    return this.req.get(url);
  }

  // ---- Account API

  getAccountInfo() {
    const url = this.server + '/api2/account/info/';
    return this.req.get(url);
  }

  listDepartments() {
    const url = this.server + '/api/v2.1/departments/';
    return this.req.get(url);
  }

  listAddressBookDepartments() {
    const url = this.server + '/api/v2.1/address-book/departments/';
    return this.req.get(url);
  }

  listAddressBookDepartmentMembers(department_id) {
    const url = this.server + '/api/v2.1/address-book/departments/' + department_id + '/members/';
    return this.req.get(url);
  }

  listGroups(withRepos = false) {
    let options = { with_repos: withRepos ? 1 : 0 };
    const url = this.server + '/api/v2.1/groups/';
    return this.req.get(url, { params: options });
  }

  listGroupRepos(groupID, page, perPage) {
    const url = this.server + '/api/v2.1/groups/' + groupID + '/libraries/';
    let params = {
    };
    if (page != undefined) {
      params.page = page;
    }
    if (perPage != undefined) {
      params.per_page = perPage;
    }
    return this.req.get(url, { params: params });
  }


  getGroup(groupID) {
    const url = this.server + '/api/v2.1/groups/' + groupID + '/';
    return this.req.get(url);
  }

  createGroup(name) {
    const url = this.server + '/api/v2.1/groups/';
    let form = new FormData();
    form.append('name', name);
    return this._sendPostRequest(url, form);
  }

  renameGroup(groupID, name) {
    const url = this.server + '/api/v2.1/groups/' + groupID + '/';
    const params = {
      name: name
    };
    return this.req.put(url, params);
  }

  deleteGroup(groupID) {
    const url = this.server + '/api/v2.1/groups/' + groupID + '/';
    return this.req.delete(url);
  }

  transferGroup(groupID, ownerName) {
    const url = this.server + '/api/v2.1/groups/' + groupID + '/';
    const params = {
      owner: ownerName
    };
    return this.req.put(url, params);
  }

  quitGroup(groupID, userName) {
    const name = encodeURIComponent(userName);
    const url = this.server + '/api/v2.1/groups/' + groupID + '/members/' + name + '/';
    return this.req.delete(url);
  }

  listGroupMembers(groupID, page, perPage, isAdmin = false, avatarSize = 64) {
    let url = this.server + '/api/v2.1/groups/' + groupID + '/members/';
    let params = {
      page: page || 1,
      per_page: perPage || 100,
      is_admin: isAdmin,
      avatar_size: avatarSize
    };
    return this.req.get(url, { params: params });
  }

  searchGroupMember(groupID, q) {
    const url = this.server + '/api/v2.1/groups/' + groupID + '/search-member/';
    const params = {
      q: q
    };
    return this.req.get(url, { params: params });
  }

  addGroupMember(groupID, userName) {
    const url = this.server + '/api/v2.1/groups/' + groupID + '/members/';
    const params = {
      email: userName
    };
    return this.req.post(url, params);
  }

  addGroupMembers(groupID, userNames) {
    const url = this.server + '/api/v2.1/groups/' + groupID + '/members/bulk/';
    let form = new FormData();
    form.append('emails', userNames.join(','));
    return this._sendPostRequest(url, form);
  }

  importGroupMembersViaFile(groupID, file) {
    const url = this.server + '/api/v2.1/groups/' + groupID + '/members/import/';
    let formData = new FormData();
    formData.append('file', file);
    return this._sendPostRequest(url, formData);
  }

  deleteGroupMember(groupID, userName) {
    const name = encodeURIComponent(userName);
    const url = this.server + '/api/v2.1/groups/' + groupID + '/members/' + name + '/';
    return this.req.delete(url);
  }

  setGroupAdmin(groupID, userName, isAdmin) {
    let name = encodeURIComponent(userName);
    let url = this.server + '/api/v2.1/groups/' + groupID + '/members/' + name + '/';
    const params = {
      is_admin: isAdmin
    };
    return this.req.put(url, params);
  }

  createGroupOwnedLibrary(groupID, repo) {
    let repoName = repo.repo_name;
    let permission = repo.permission ? repo.permission : 'rw';
    const url = this.server + '/api/v2.1/groups/' + groupID + '/group-owned-libraries/';
    let form = new FormData();
    form.append('name', repoName); // need to modify endpoint api;
    if (repo.passwd) {
      form.append('passwd', repo.passwd);
    }
    form.append('permission', permission);
    if (repo.library_template) {
      form.append('library_template', repo.library_template);
    }
    return this._sendPostRequest(url, form);
  }

  deleteGroupOwnedLibrary(groupID, repoID) {
    const url = this.server + '/api/v2.1/groups/' + groupID + '/group-owned-libraries/' + repoID + '/';
    return this.req.delete(url);
  }

  renameGroupOwnedLibrary(groupID, repoID, newName) {
    const url = this.server + '/api/v2.1/groups/' + groupID + '/group-owned-libraries/' + repoID + '/';
    let form = new FormData();
    form.append('name', newName);
    return this.req.put(url, form);
  }

  shareGroupOwnedRepoToUser(repoID, permission, username, path) {
    const url = this.server + '/api/v2.1/group-owned-libraries/' + repoID + '/user-share/';
    let form = new FormData();
    form.append('permission', permission);
    form.append('path', path);
    if (Array.isArray(username)) {
      username.forEach(item => {
        form.append('username', item);
      });
    } else {
      form.append('username', username);
    }
    return this._sendPostRequest(url, form);
  }

  modifyGroupOwnedRepoUserSharedPermission(repoID, permission, username, path) { // need check
    const url = this.server + '/api/v2.1/group-owned-libraries/' + repoID + '/user-share/';
    let form = new FormData();
    form.append('permission', permission);
    form.append('username', username);
    form.append('path', path);
    return this.req.put(url, form);
  }

  deleteGroupOwnedRepoSharedUserItem(repoID, username, path) {
    const url = this.server + '/api/v2.1/group-owned-libraries/' + repoID + '/user-share/';
    let params = { username: username, path: path };
    return this.req.delete(url, { data: params });
  }

  shareGroupOwnedRepoToGroup(repoID, permission, groupIDs, path) {
    const url = this.server + '/api/v2.1/group-owned-libraries/' + repoID + '/group-share/';
    let form = new FormData();
    form.append('permission', permission);
    form.append('path', path);
    groupIDs.forEach(item => {
      form.append('group_id', item);
    });
    return this._sendPostRequest(url, form);
  }

  modifyGroupOwnedRepoGroupSharedPermission(repoID, permission, groupID, path) { // need check
    const url = this.server + '/api/v2.1/group-owned-libraries/' + repoID + '/group-share/';
    let form = new FormData();
    form.append('permission', permission);
    form.append('group_id', groupID);
    form.append('path', path);
    return this.req.put(url, form);
  }

  deleteGroupOwnedRepoSharedGroupItem(repoID, groupID, path) {
    const url = this.server + '/api/v2.1/group-owned-libraries/' + repoID + '/group-share/';
    let params = { group_id: groupID, path: path };
    return this.req.delete(url, { data: params });
  }

  deleteGroupInviteLinks(groupID, token) {
    const url = `${this.server}/api/v2.1/groups/${groupID}/invite-links/${token}/`;
    return this.req.delete(url);
  }

  addGroupInviteLinks(groupID) {
    const url = `${this.server}/api/v2.1/groups/${groupID}/invite-links/`;
    let formData = new FormData();
    return this._sendPostRequest(url, formData);
  }

  getGroupInviteLinks(groupID) {
    const url = `${this.server}/api/v2.1/groups/${groupID}/invite-links/`;
    return this.req.get(url);
  }

  // ---- share operation

  listShareLinks({ repoID, path, page, perPage }) {
    const url = this.server + '/api/v2.1/share-links/';
    const params = {
    };
    if (repoID && path) {
      params.repo_id = repoID;
      params.path = path;
    }
    params.page = page || 1;
    params.per_page = perPage || 25;
    return this.req.get(url, { params: params });
  }

  createMultiShareLink(repoID, path, password, expirationTime, permissions) {
    const url = this.server + '/api/v2.1/multi-share-links/';
    let form = new FormData();
    form.append('path', path);
    form.append('repo_id', repoID);
    if (permissions) {
      form.append('permissions', permissions);
    }
    if (password) {
      form.append('password', password);
    }
    if (expirationTime) {
      form.append('expiration_time', expirationTime);
    }
    return this._sendPostRequest(url, form);
  }

  batchCreateMultiShareLink(repoID, path, shareLinkNum, autoGeneratePassword, expirationTime, permissions) {
    const url = this.server + '/api/v2.1/multi-share-links/batch/';
    let form = new FormData();
    form.append('path', path);
    form.append('repo_id', repoID);
    form.append('number', shareLinkNum);
    form.append('auto_generate_password', autoGeneratePassword);

    if (permissions) {
      form.append('permissions', permissions);
    }

    if (expirationTime) {
      form.append('expiration_time', expirationTime);
    }
    return this._sendPostRequest(url, form);
  }

  createShareLink(repoID, path, password, expirationTime, permissions) {
    const url = this.server + '/api/v2.1/share-links/';
    let form = new FormData();
    form.append('path', path);
    form.append('repo_id', repoID);
    if (permissions) {
      form.append('permissions', permissions);
    }
    if (password) {
      form.append('password', password);
    }
    if (expirationTime) {
      form.append('expiration_time', expirationTime);
    }
    return this._sendPostRequest(url, form);
  }

  updateShareLink(token, permissions, expirationTime = '') {
    var url = this.server + '/api/v2.1/share-links/' + token + '/';
    let form = new FormData();
    if (permissions) {
      form.append('permissions', permissions);
    }
    if (expirationTime) {
      form.append('expiration_time', expirationTime);
    }
    return this.req.put(url, form);
  }

  deleteShareLink(token) {
    const url = this.server + '/api/v2.1/share-links/' + token + '/';
    return this.req.delete(url);
  }

  deleteShareLinks(tokens) {
    const url = this.server + '/api/v2.1/share-links/';
    let param = { tokens: tokens };
    return this.req.delete(url, { data: param });
  }

  cleanInvalidShareLinks() {
    const url = this.server + '/api/v2.1/share-links/clean-invalid/';
    return this.req.delete(url);
  }

  sendShareLink(token, email, extraMsg) {
    const url = this.server + '/api2/send-share-link/';
    let form = new FormData();
    form.append('token', token);
    form.append('email', email);
    if (extraMsg) {
      form.append('extra_msg', extraMsg);
    }
    return this._sendPostRequest(url, form);
  }

  // for repo & folder
  getRepoFolderShareInfo(repoID, path) {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/share-info/';
    let params = { };
    if (path != undefined) {
      params.path = path;
    }
    return this.req.get(url, { params: params });
  }

  listRepoShareLinks(repoID) {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/share-links/';
    return this.req.get(url);
  }

  deleteRepoShareLink(repoID, token) {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/share-links/' + token + '/';
    return this.req.delete(url);
  }

  listSharedRepos() {
    const url = this.server + '/api/v2.1/shared-repos/';
    return this.req.get(url);
  }

  getShareLinkRepoTags(token) {
    var url = this.server + '/api/v2.1/share-links/' + token + '/repo-tags/';
    return this.req.get(url);
  }

  getShareLinkTaggedFiles(token, tag_id) {
    var url = this.server + '/api/v2.1/share-links/' + token + '/tagged-files/' + tag_id + '/';
    return this.req.get(url);
  }

  getAllRepoFolderShareInfo(repoID, shareTo) {
    const url = this.server + '/api/v2.1/repo-folder-share-info/';
    let params = {
      repo_id: repoID
    };
    if (shareTo) {
      params.share_to = shareTo;
    }
    return this.req.get(url, { params: params });
  }

  // upload-link
  listUserUploadLinks() {
    const url = this.server + '/api/v2.1/upload-links/';
    return this.req.get(url);
  }

  getUploadLink(repoID, path) {
    const url = this.server + '/api/v2.1/upload-links/?repo_id=' + repoID + '&path=' + encodeURIComponent(path);
    return this.req.get(url);
  }

  createUploadLink(repoID, path, password, expirationTime) {
    const url = this.server + '/api/v2.1/upload-links/';
    let form = new FormData();
    form.append('path', path);
    form.append('repo_id', repoID);
    if (password) {
      form.append('password', password);
    }
    if (expirationTime) {
      form.append('expiration_time', expirationTime);
    }
    return this._sendPostRequest(url, form);
  }

  updateUploadLink(token, expirationTime) {
    var url = this.server + '/api/v2.1/upload-links/' + token + '/';
    let form = new FormData();
    form.append('expiration_time', expirationTime);
    return this.req.put(url, form);
  }

  deleteUploadLink(token) {
    const url = this.server + '/api/v2.1/upload-links/' + token + '/';
    return this.req.delete(url);
  }

  cleanInvalidUploadLinks() {
    const url = this.server + '/api/v2.1/upload-links/clean-invalid/';
    return this.req.delete(url);
  }

  sendUploadLink(token, email, extraMsg) {
    const url = this.server + '/api2/send-upload-link/';
    let form = new FormData();
    form.append('token', token);
    form.append('email', email);
    if (extraMsg) {
      form.append('extra_msg', extraMsg);
    }
    return this._sendPostRequest(url, form);
  }

  listRepoUploadLinks(repoID) {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/upload-links/';
    return this.req.get(url);
  }

  deleteRepoUploadLink(repoID, token) {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/upload-links/' + token + '/';
    return this.req.delete(url);
  }

  // todo send upload link email

  // shared-libraries
  listSharedItems(repoID, path, shareType) { // shareType: user, group
    path = encodeURIComponent(path);
    const url = this.server + '/api2/repos/' + repoID + '/dir/shared_items/?p=' + path + '&share_type=' + shareType;
    return this.req.get(url);
  }

  getBeSharedRepos() { // listBeSharedRepos
    const url = this.server + '/api2/beshared-repos/';
    return this.req.get(url);
  }

  leaveShareRepo(repoID, options) { // deleteBeSharedRepo
    const url = this.server + '/api2/beshared-repos/' + repoID + '/';
    return this.req.delete(url, { params: options });
  }

  // share repo to user is same to share Folder

  // unshare repo to user is same to unshare Folder

  deleteShareToUserItem(repoID, path, shareType, username) {
    path = encodeURIComponent(path);
    const url = this.server + '/api2/repos/' + repoID + '/dir/shared_items/?p=' + path + '&share_type=' + shareType + '&username=' + encodeURIComponent(username);
    return this.req.delete(url);
  }

  updateShareToUserItemPermission(repoID, path, shareType, username, permission) {
    path = encodeURIComponent(path);
    const url = this.server + '/api2/repos/' + repoID + '/dir/shared_items/?p=' + path + '&share_type=' + shareType + '&username=' + encodeURIComponent(username);
    let form = new FormData();
    form.append('permission', permission);
    return this._sendPostRequest(url, form);
  }

  // share repo to group is same to share folder

  // unshare repo to group is same to unshare folder

  deleteShareToGroupItem(repoID, path, shareType, groupID) {
    path = encodeURIComponent(path);
    const url = this.server + '/api2/repos/' + repoID + '/dir/shared_items/?p=' + path + '&share_type=' + shareType + '&group_id=' + groupID;
    return this.req.delete(url);
  }

  updateShareToGroupItemPermission(repoID, path, shareType, groupID, permission) {
    path = encodeURIComponent(path);
    const url = this.server + '/api2/repos/' + repoID + '/dir/shared_items/?p=' + path + '&share_type=' + shareType + '&group_id=' + groupID;
    let form = new FormData();
    form.append('permission', permission);
    return this._sendPostRequest(url, form);
  }

  leaveShareGroupOwnedRepo(repoID) {
    const url = this.server + '/api/v2.1/group-owned-libraries/user-share-in-libraries/' + repoID + '/';
    return this.req.delete(url);
  }

  shareableGroups() {
    const url = this.server + '/api/v2.1/shareable-groups/';
    return this.req.get(url);
  }

  getSharedRepos() {
    const url = this.server + '/api2/shared-repos/';
    return this.req.get(url);
  }

  updateRepoSharePerm(repoID, options) {
    const url = this.server + '/api/v2.1/shared-repos/' + repoID + '/';
    return this.req.put(url, options);
  }

  unshareRepo(repoID, options) {
    const url = this.server + '/api/v2.1/shared-repos/' + repoID + '/';
    return this.req.delete(url, { params: options });
  }

  unshareRepoToGroup(repoID, groupID) {
    const url = this.server + '/api/v2.1/groups/' + groupID + '/libraries/' + repoID + '/';
    return this.req.delete(url);
  }

  // shared folders
  shareFolder(repoID, path, shareType, permission, paramArray) { // shareType: user group
    path = encodeURIComponent(path);
    var form = new FormData();
    form.append('share_type', shareType);
    form.append('permission', permission);
    if (shareType == 'user') {
      for (let i = 0; i < paramArray.length; i++) {
        form.append('username', paramArray[i]);
      }
    } else {
      for (let i = 0; i < paramArray.length; i++) {
        form.append('group_id', paramArray[i]);
      }
    }
    const url = this.server + '/api2/repos/' + repoID + '/dir/shared_items/?p=' + path;
    return this.req.put(url, form);
  }

  listSharedFolders() {
    const url = this.server + '/api/v2.1/shared-folders/';
    return this.req.get(url);
  }

  updateFolderSharePerm(repoID, data, options) {
    const url = this.server + '/api2/repos/' + repoID + '/dir/shared_items/';
    return this.req.post(url, data, { params: options }); // due to the old api, use 'post' here
  }

  unshareFolder(repoID, options) {
    const url = this.server + '/api2/repos/' + repoID + '/dir/shared_items/';
    return this.req.delete(url, { params: options });
  }

  listCustomPermissions(repoID) {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/custom-share-permissions/';
    return this.req.get(url);
  }

  createCustomPermission(repoID, permission_name, permission_desc, permission) {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/custom-share-permissions/';
    const data = {
      permission_name: permission_name,
      description: permission_desc,
      permission: JSON.stringify(permission)
    };
    return this.req.post(url, data);
  }

  getCustomPermission(repoID, permissionID) {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/custom-share-permissions/' + permissionID + '/';
    return this.req.get(url);
  }

  deleteCustomPermission(repoID, permissionID) {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/custom-share-permissions/' + permissionID + '/';
    return this.req.delete(url);
  }

  updateCustomPermission(repoID, permission) {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/custom-share-permissions/' + permission.id + '/';
    const data = {
      permission_name: permission.name,
      description: permission.description,
      permission: JSON.stringify(permission.permission)
    };
    return this.req.put(url, data);
  }

  // ---- repo(library) operation
  createMineRepo(repo) {
    const url = this.server + '/api2/repos/?from=web';
    return this.req.post(url, repo);
  }

  createGroupRepo(groupID, repo) {
    const url = this.server + '/api/v2.1/groups/' + groupID + '/libraries/';
    let form = new FormData();
    form.append('repo_name', repo.repo_name);
    if (repo.password) {
      form.append('password', repo.password);
    }
    form.append('permission', repo.permission);
    if (repo.library_template) {
      form.append('library_template', repo.library_template);
    }
    return this._sendPostRequest(url, form);
  }

  listRepos(options) {
    /*
     * options: `{type: 'shared'}`, `{type: ['mine', 'shared', ...]}`
     */
    let url = this.server + '/api/v2.1/repos/';

    if (!options) {
      // fetch all types of repos
      return this.req.get(url);
    }

    return this.req.get(url, {
      params: options,
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

  getRepoInfo(repoID) {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/';
    return this.req.get(url);
  }

  getRepoHistoryLimit(repoID) {
    const url = this.server + '/api2/repos/' + repoID + '/history-limit/';
    return this.req.get(url);
  }

  setRepoHistoryLimit(repoID, historyDays) {
    const url = this.server + '/api2/repos/' + repoID + '/history-limit/';
    let form = new FormData();
    form.append('keep_days', historyDays);
    return this.req.put(url, form);
  }

  resetAndSendEncryptedRepoPassword(repoID) {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/send-new-password/';
    let form = new FormData();
    return this._sendPostRequest(url, form);
  }

  deleteRepo(repoID) {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/';
    return this.req.delete(url);
  }

  renameRepo(repoID, newName) {
    const url = this.server + '/api2/repos/' + repoID + '/?op=rename';
    let form = new FormData();
    form.append('repo_name', newName);
    return this._sendPostRequest(url, form);
  }

  transferRepo(repoID, owner) {
    const url = this.server + '/api2/repos/' + repoID + '/owner/';
    let form = new FormData();
    form.append('owner', owner);
    return this.req.put(url, form);
  }

  setRepoDecryptPassword(repoID, password) {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/set-password/';
    let form = new FormData();
    form.append('password', password);
    return this._sendPostRequest(url, form);
  }

  changeEncryptedRepoPassword(repoID, oldPassword, newPassword) {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/set-password/';
    const data = {
      'old_password': oldPassword,
      'new_password': newPassword
    };
    return this.req.put(url, data);
  }

  createPublicRepo(repo) {
    const url = this.server + '/api2/repos/public/';
    return this.req.post(url, repo);
  }

  selectOwnedRepoToPublic(repoID, options) { // todo change a exist repo to public
    const url = this.server + '/api/v2.1/shared-repos/' + repoID + '/';
    return this.req.put(url, options);
  }

  // remove public repo is same to unshareRepo;

  getSource() { // for search
    let CancelToken = axios.CancelToken;
    let source = CancelToken.source();
    return source;
  }

  getSearchInfo() {
    const url = this.server + '/api2/search-info/';
    return this.req.get(url);
  }

  searchFilesInPublishedRepo(repoID, q, page, perPage, searchFilenameOnly) {
    const url = this.server + '/api/v2.1/published-repo-search/';
    let params = {
      repo_id: repoID,
      q: q,
      page: page,
      per_page: perPage,
      search_filename_only: searchFilenameOnly || false,
    };
    return this.req.get(url, { params: params });
  }

  searchFiles(searchParams, cancelToken) {
    let url = this.server + '/api2/search/';
    url = url + '?q=' + searchParams.q;
    if (searchParams.search_repo) {url = url + '&search_repo=' + searchParams.search_repo;}
    if (searchParams.search_ftypes) {url = url + '&search_ftypes=' + searchParams.search_ftypes;}
    if (searchParams.page) {url = url + '&page=' + searchParams.page;}
    if (searchParams.per_page) {url = url + '&per_page=' + searchParams.per_page;}
    if (searchParams.search_path) {url = url + '&search_path=' + searchParams.search_path;}
    if (searchParams.obj_type) {url = url + '&obj_type=' + searchParams.obj_type;}
    if (searchParams.input_fexts) {url = url + '&input_fexts=' + searchParams.input_fexts;}
    if (searchParams.with_permission) {url = url + '&with_permission=' + searchParams.with_permission;}
    if (searchParams.time_from) {url = url + '&time_from=' + searchParams.time_from;}
    if (searchParams.time_to) {url = url + '&time_to=' + searchParams.time_to;}
    if (searchParams.size_from) {url = url + '&size_from=' + searchParams.size_from;}
    if (searchParams.size_to) {url = url + '&size_to=' + searchParams.size_to;}
    if (searchParams.shared_from) {url = url + '&shared_from=' + searchParams.shared_from;}
    if (searchParams.not_shared_from) {url = url + '&not_shared_from=' + searchParams.not_shared_from;}
    if (searchParams.search_filename_only) {url = url + '&search_filename_only=' + searchParams.search_filename_only;}
    if (searchParams.ftype) {
      for (let i = 0; i < searchParams.ftype.length; i++) {
        url = url + '&ftype=' + searchParams.ftype[i];}
    }
    return this.req.get(url, { cancelToken: cancelToken });
  }

  searchFileInRepo(repoID, q) {
    const url = this.server + '/api/v2.1/search-file/';
    const params = {
      repo_id: repoID,
      q: q
    };
    return this.req.get(url, { params: params });
  }

  listRepoAPITokens(repo_id) {
    var url = this.server + '/api/v2.1/repos/' + repo_id + '/repo-api-tokens/';
    return this.req.get(url);
  }

  addRepoAPIToken(repo_id, app_name, permission) {
    var url = this.server + '/api/v2.1/repos/' + repo_id + '/repo-api-tokens/';
    var form = new FormData();
    form.append('app_name', app_name);
    form.append('permission', permission);
    return this._sendPostRequest(url, form);
  }

  deleteRepoAPIToken(repo_id, app_name) {
    var url = this.server + '/api/v2.1/repos/' + repo_id + '/repo-api-tokens/' + app_name + '/';
    return this.req.delete(url);
  }

  updateRepoAPIToken(repo_id, app_name, permission) {
    var url = this.server + '/api/v2.1/repos/' + repo_id + '/repo-api-tokens/' + app_name + '/';
    var form = new FormData();
    form.append('permission', permission);
    return this.req.put(url, form);
  }

  // admin
  listDeletedRepo() {
    const url = this.server + '/api/v2.1/deleted-repos/';
    return this.req.get(url);
  }

  restoreDeletedRepo(repoID) {
    const url = this.server + '/api/v2.1/deleted-repos/';
    let form = new FormData();
    form.append('repo_id', repoID);
    return this._sendPostRequest(url, form);
  }

  // ---- directory operation
  listDir(repoID, dirPath, { recursive = false, type = '', with_thumbnail = false, with_parents = false } = {}) {
    /*
     * opts: `{recursive: true}`, `{'with_thumbnail': true}`
     */
    const url = this.server + '/api/v2.1/repos/' + repoID + '/dir/';
    let params = {};
    params.p = dirPath;
    if (recursive) {
      params.recursive = recursive ? 1 : 0;
    }
    if (type) {
      params.t = type;
    }
    if (with_thumbnail) {
      params.with_thumbnail = with_thumbnail;
    }
    if (with_parents) {
      params.with_parents = with_parents;
    }
    return this.req.get(url, { params: params });
  }

  listWikiDir(slug, dirPath, withParents) {
    const path = encodeURIComponent(dirPath);
    let url = this.server + '/api/v2.1/wikis/' + encodeURIComponent(slug) + '/dir/?p=' + path;
    if (withParents) {
      url = this.server + '/api/v2.1/wikis/' + encodeURIComponent(slug) + '/dir/?p=' + path + '&with_parents=' + withParents;
    }
    return this.req.get(url);
  }

  getDirInfo(repoID, dirPath) {
    const path = encodeURIComponent(dirPath);
    const url = this.server + '/api/v2.1/repos/' + repoID + '/dir/detail/?path=' + path;
    return this.req.get(url);
  }

  createDir(repoID, dirPath) {
    const path = encodeURIComponent(dirPath);
    const url = this.server + '/api2/repos/' + repoID + '/dir/?p=' + path;
    let form = new FormData();
    form.append('operation', 'mkdir');
    return this._sendPostRequest(url, form);
  }

  renameDir(repoID, dirPath, newdirName) {
    const path = encodeURIComponent(dirPath);
    const url = this.server + '/api2/repos/' + repoID + '/dir/?p=' + path;
    let form = new FormData();
    form.append('operation', 'rename');
    form.append('newname', newdirName);
    return this._sendPostRequest(url, form);
  }

  deleteDir(repoID, dirPath) {
    const path = encodeURIComponent(dirPath);
    const url = this.server + '/api/v2.1/repos/' + repoID + '/dir/?p=' + path;
    return this.req.delete(url);
  }

  // ---- multiple(File&Folder) operation
  copyDir(repoID, dstrepoID, dstfilePath, dirPath, direntNames) {
    let paths = [];
    let url = this.server;
    url += repoID === dstrepoID ? '/api/v2.1/repos/sync-batch-copy-item/' : '/api/v2.1/repos/async-batch-copy-item/';
    if (Array.isArray(direntNames)) {
      paths = direntNames;
    } else {
      paths.push(direntNames);
    }
    let operation = {
      'src_repo_id': repoID,
      'src_parent_dir': dirPath,
      'dst_repo_id': dstrepoID,
      'dst_parent_dir': dstfilePath,
      'src_dirents': paths
    };

    return this._sendPostRequest(url, operation, { headers: { 'Content-Type': 'application/json' } });
  }

  moveDir(repoID, dstrepoID, dstfilePath, dirPath, direntNames) {
    let paths = [];
    let url = this.server;

    url += repoID === dstrepoID ? '/api/v2.1/repos/sync-batch-move-item/' : '/api/v2.1/repos/async-batch-move-item/';
    if (Array.isArray(direntNames)) {
      paths = direntNames;
    } else {
      paths.push(direntNames);
    }
    let operation = {
      'src_repo_id': repoID,
      'src_parent_dir': dirPath,
      'dst_repo_id': dstrepoID,
      'dst_parent_dir': dstfilePath,
      'src_dirents': paths
    };

    return this._sendPostRequest(url, operation, { headers: { 'Content-Type': 'application/json' } });
  }

  queryAsyncOperationProgress(task_id) {
    const url = this.server + '/api/v2.1/query-copy-move-progress/?task_id=' + task_id;
    return this.req.get(url);
  }

  cancelCopyMoveOperation(task_id) {
    const url = this.server + '/api/v2.1/copy-move-task/';
    let params = {
      task_id: task_id
    };
    return this.req.delete(url, { data: params });
  }

  deleteMutipleDirents(repoID, parentDir, direntNames) {
    const url = this.server + '/api/v2.1/repos/batch-delete-item/';
    let operation = {
      'repo_id': repoID,
      'parent_dir': parentDir,
      'dirents': direntNames
    };
    return this.req.delete(url, { data: operation }, { headers: { 'Content-Type': 'application/json' } });
  }

  zipDownload(repoID, parent_dir, dirents) { // can download one dir
    const url = this.server + '/api/v2.1/repos/' + repoID + '/zip-task/';
    const form = new FormData();
    form.append('parent_dir', parent_dir);
    if (Array.isArray(dirents)) {
      dirents.forEach(item => {
        form.append('dirents', item);
      });
    } else {
      form.append('dirents', dirents);
    }

    return this._sendPostRequest(url, form);
  }

  queryZipProgress(zip_token) {
    const url = this.server + '/api/v2.1/query-zip-progress/?token=' + zip_token;
    return this.req.get(url);
  }

  cancelZipTask(zip_token) {
    const url = this.server + '/api/v2.1/cancel-zip-task/';
    const form = new FormData();
    form.append('token', zip_token);
    return this.req.post(url, form);
  }

  // ---- File Operation
  getFileInfo(repoID, filePath) {
    const path = encodeURIComponent(filePath);
    const url = this.server + '/api2/repos/' + repoID + '/file/detail/?p=' + path;
    return this.req.get(url);
  }

  getFileHistory(repoID, folderPath) {
    const url = this.server + '/api2/repos/' + repoID + '/file/history/?p=' + encodeURIComponent(folderPath);
    return this.req.get(url);
  }

  getFileDownloadLink(repoID, filePath) {
    // reuse default to 1 to eliminate cross domain request problem
    //   In browser, the browser will send an option request to server first, the access Token
    //   will become invalid if reuse=0
    const path = encodeURIComponent(filePath);
    const url = this.server + '/api2/repos/' + repoID + '/file/?p=' + path + '&reuse=1';
    return this.req.get(url);
  }

  getFileContent(downloadLink) {
    return axios.create().get(downloadLink);
  }

  createFile(repoID, filePath, isDraft) {
    const path = encodeURIComponent(filePath);
    const url = this.server + '/api/v2.1/repos/' + repoID + '/file/?p=' + path;
    let form = new FormData();
    form.append('operation', 'create');
    form.append('is_draft', isDraft);
    return this._sendPostRequest(url, form);
  }

  renameFile(repoID, filePath, newfileName) {
    const path = encodeURIComponent(filePath);
    const url = this.server + '/api/v2.1/repos/' + repoID + '/file/?p=' + path;
    let form = new FormData();
    form.append('operation', 'rename');
    form.append('newname', newfileName);
    return this._sendPostRequest(url, form);
  }

  convertFile(repoID, filePath, dstType) {
    const path = encodeURIComponent(filePath);
    const url = this.server + '/api/v2.1/repos/' + repoID + '/file/?p=' + path;
    let form = new FormData();
    form.append('operation', 'convert');
    form.append('dst_type', dstType);
    return this._sendPostRequest(url, form);
  }

  lockfile(repoID, filePath, expire) {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/file/?p=' + encodeURIComponent(filePath);
    let form = new FormData();
    form.append('operation', 'lock');
    if (expire != undefined) {
      form.append('expire', expire);
    }
    return this.req.put(url, form);
  }

  unlockfile(repoID, filePath) {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/file/?p=' + encodeURIComponent(filePath);
    let form = new FormData();
    form.append('operation', 'unlock');
    return this.req.put(url, form);
  }

  // move need to add

  // copy need to add

  revertFile(repoID, path, commitID) {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/file/?p=' + encodeURIComponent(path);
    let form = new FormData();
    form.append('operation', 'revert');
    form.append('commit_id', commitID);
    return this._sendPostRequest(url, form);
  }

  revertFolder(repoID, path, commitID) {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/dir/?p=' + encodeURIComponent(path);
    let form = new FormData();
    form.append('operation', 'revert');
    form.append('commit_id', commitID);
    return this._sendPostRequest(url, form);
  }

  revertRepo(repoID, commitID) {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/commits/' + commitID + '/revert/';
    return this.req.post(url);
  }

  deleteFile(repoID, filePath) {
    const path = encodeURIComponent(filePath);
    const url = this.server + '/api/v2.1/repos/' + repoID + '/file/?p=' + path;
    return this.req.delete(url);
  }

  getFileServerUploadLink(repoID, folderPath) {
    const path = encodeURIComponent(folderPath);
    const url = this.server + '/api2/repos/' + repoID + '/upload-link/?p=' + path + '&from=web';
    return this.req.get(url);
  }

  // for shared folder link with 'can_upload' permission
  sharedLinkGetFileUploadUrl(token, path) {
    const url = this.server + '/api/v2.1/share-links/' + token + '/upload/?path=' + encodeURIComponent(path);
    return this.req.get(url);
  }

  getFileUploadedBytes(repoID, filePath, fileName) {
    let url = this.server + '/api/v2.1/repos/' + repoID + '/file-uploaded-bytes/';
    let params = {
      parent_dir: filePath,
      file_name: fileName,
    };
    return this.req.get(url, { params: params });
  }

  sharedUploadLinkGetFileUploadUrl(token) {
    const url = this.server + '/api/v2.1/upload-links/' + token + '/upload/';
    return this.req.get(url);
  }

  shareLinksUploadDone(token, filePath, isDir) {
    var url = this.server + '/api/v2.1/share-links/' + token + '/upload/done/';
    var form = new FormData();
    form.append('file_path', filePath);
    if (isDir != undefined) {
      form.append('is_dir', isDir);
    }
    return this._sendPostRequest(url, form);
  }

  uploadImage(uploadLink, formData, onUploadProgress = null) {
    return (
      axios.create()({
        method: 'post',
        data: formData,
        url: uploadLink,
        onUploadProgress: onUploadProgress
      })
    );
  }

  getUpdateLink(repoID, folderPath) {
    const url = this.server + '/api2/repos/' + repoID + '/update-link/?p=' + encodeURIComponent(folderPath);
    return this.req.get(url);
  }

  updateFile(uploadLink, filePath, fileName, data) {
    let formData = new FormData();
    formData.append('target_file', filePath);
    formData.append('filename', fileName);
    let blob = new Blob([data], { type: 'text/plain' });
    formData.append('file', blob);
    return (
      axios.create()({
        method: 'post',
        url: uploadLink,
        data: formData,
      })
    );
  }

  listFileHistoryRecords(repoID, path, page, per_page) {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/file/new_history/';
    const params = {
      path: path,
      page: page,
      per_page: per_page,
    };
    return this.req.get(url, { params: params });
  }

  listOldFileHistoryRecords(repoID, path, commitID) {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/file/history/';
    const params = {
      path: path,
      commit_id: commitID,
    };
    return this.req.get(url, { params: params });
  }

  getFileRevision(repoID, commitID, filePath) {
    let url = this.server + '/api2/' + 'repos/' + repoID + '/file' + '/revision/?p=' + encodeURIComponent(filePath) + '&commit_id=' + commitID;
    return this.req.get(url);
  }

  // file extended properties
  getFileExtendedProperties(repoID, path) {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/extended-properties/?path=' + path;
    return this.req.get(url);
  }

  newFileExtendedProperties(repoID, path, data) {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/extended-properties/';
    var form = new FormData();
    form.append('path', path);
    form.append('props_data', JSON.stringify(data));
    return this._sendPostRequest(url, form);
  }

  updateFileExtendedProperties(repoID, path, data) {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/extended-properties/';
    var form = new FormData();
    form.append('path', path);
    form.append('props_data', JSON.stringify(data));
    return this.req.put(url, form);
  }

  deleteFileExtendedProperties(repoID, path) {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/extended-properties/?path=' + path;
    return this.req.delete(url);
  }

  applyFolderExtendedProperties(repoID, path) {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/apply-folder-extended-properties/';
    var form = new FormData();
    form.append('path', path);
    return this.req.post(url, form);
  }

  // file commit api
  deleteComment(repoID, commentID) {
    const url = this.server + '/api2/repos/' + repoID + '/file/comments/' + commentID + '/';
    return this.req.delete(url);
  }

  listComments(repoID, filePath, resolved) {
    const path = encodeURIComponent(filePath);
    let url = this.server + '/api2/repos/' + repoID + '/file/comments/?p=' + path;
    if (resolved) {
      url = url + '&resolved=' + resolved;
    }
    return this.req.get(url);
  }

  postComment(repoID, filePath, comment, detail) {
    const path = encodeURIComponent(filePath);
    const url = this.server + '/api2/repos/' + repoID + '/file/comments/?p=' + path;
    let form = new FormData();
    form.append('comment', comment);
    if (detail) {
      form.append('detail', detail);
    }
    return this._sendPostRequest(url, form);
  }

  getCommentsNumber(repoID, path) {
    const p = encodeURIComponent(path);
    const url = this.server + '/api2/repos/' + repoID + '/file/comments/counts/?p=' + p;
    return this.req.get(url);
  }

  updateComment(repoID, commentID, resolved, detail, comment) {
    const url = this.server + '/api2/repos/' + repoID + '/file/comments/' + commentID + '/';
    let params = {};
    if (resolved) params.resolved = resolved;
    if (detail) params.detail = detail;
    if (comment) params.comment = comment;
    return this.req.put(url, params);
  }

  // starred
  listStarredItems() {
    const url = this.server + '/api/v2.1/starred-items/';
    return this.req.get(url);
  }

  starItem(repoID, path) {
    const url = this.server + '/api/v2.1/starred-items/';
    let form = new FormData();
    form.append('repo_id', repoID);
    form.append('path', path);
    return this._sendPostRequest(url, form);
  }

  unstarItem(repoID, path) {
    const url = this.server + '/api/v2.1/starred-items/?repo_id=' + repoID + '&path=' + encodeURIComponent(path);
    return this.req.delete(url);
  }

  monitorRepo(repoID) {
    const url = this.server + '/api/v2.1/monitored-repos/';
    let form = new FormData();
    form.append('repo_id', repoID);
    return this._sendPostRequest(url, form);
  }

  unMonitorRepo(repoID) {
    const url = this.server + '/api/v2.1/monitored-repos/' + repoID + '/';
    return this.req.delete(url);
  }

  // ---- tags module api
  // repo tags
  listRepoTags(repoID) {
    var url = this.server + '/api/v2.1/repos/' + repoID + '/repo-tags/';
    return this.req.get(url);
  }

  createRepoTag(repoID, name, color) {
    var url = this.server + '/api/v2.1/repos/' + repoID + '/repo-tags/';
    var form = new FormData();
    form.append('name', name);
    form.append('color', color);
    return this._sendPostRequest(url, form);
  }

  createRepoTags(repoID, tags) {
    var url = this.server + '/api/v2.1/repos/' + repoID + '/repo-tags/';
    var params = { tags };
    return this.req.put(url, params);
  }

  deleteRepoTag(repoID, repo_tag_id) {
    var url = this.server + '/api/v2.1/repos/' + repoID + '/repo-tags/' + repo_tag_id + '/';
    return this.req.delete(url);
  }

  updateRepoTag(repoID, repo_tag_id, name, color) {
    var url = this.server + '/api/v2.1/repos/' + repoID + '/repo-tags/' + repo_tag_id + '/';
    var params = {
      name: name,
      color: color,
    };
    return this.req.put(url, params);
  }

  listTaggedFiles(repoID, repoTagId) {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/tagged-files/' + repoTagId + '/';
    return this.req.get(url);
  }

  // file tag api
  listFileTags(repoID, filePath) {
    var p = encodeURIComponent(filePath);
    var url = this.server + '/api/v2.1/repos/' + repoID + '/file-tags/?file_path=' + p;
    return this.req.get(url);
  }

  addFileTag(repoID, filePath, repoTagId) {
    var form = new FormData();
    form.append('file_path', filePath);
    form.append('repo_tag_id', repoTagId);
    var url = this.server + '/api/v2.1/repos/' + repoID + '/file-tags/';
    return this._sendPostRequest(url, form);
  }

  deleteFileTag(repoID, fileTagId) {
    var url = this.server + '/api/v2.1/repos/' + repoID + '/file-tags/' + fileTagId + '/';
    return this.req.delete(url);
  }

  saveSharedFile(repoID, dstPath, sharedToken, filePath) {
    const url = this.server + '/api/v2.1/share-links/' + sharedToken + '/save-file-to-repo/';
    let form = new FormData();
    form.append('dst_repo_id', repoID);
    form.append('dst_parent_dir', dstPath);
    // for file in shared dir
    if (filePath) {
      form.append('path', filePath);
    }
    return this._sendPostRequest(url, form);
  }

  saveSharedDir(repoID, dstPath, sharedToken, parentDir, items) {
    const url = this.server + '/api/v2.1/share-links/' + sharedToken + '/save-items-to-repo/';
    let form = new FormData();

    form.append('src_parent_dir', parentDir);
    items.forEach(item => {
      form.append('src_dirents', item);
    });

    form.append('dst_repo_id', repoID);
    form.append('dst_parent_dir', dstPath);

    return this._sendPostRequest(url, form);
  }

  addAbuseReport(sharedToken, abuseType, description, reporter, filePath) {
    const url = this.server + '/api/v2.1/abuse-reports/';
    let form = new FormData();
    form.append('share_link_token', sharedToken);
    form.append('abuse_type', abuseType);
    form.append('description', description);
    form.append('reporter', reporter);
    form.append('file_path', filePath);
    return this._sendPostRequest(url, form);
  }

  getInternalLink(repoID, filePath, direntType) {
    let isDir = direntType === 'dir' ? true : false;
    const path = encodeURIComponent(filePath);
    const url = this.server + '/api/v2.1/smart-link/?repo_id=' + repoID + '&path=' + path + '&is_dir=' + isDir;
    return this.req.get(url);
  }

  getWikiFileContent(slug, filePath) {
    const path = encodeURIComponent(filePath);
    const time = new Date().getTime();
    const url = this.server + '/api/v2.1/wikis/' + encodeURIComponent(slug) + '/content/' + '?p=' + path + '&_=' + time;
    return this.req.get(url);
  }

  // ---- Avatar API
  getUserAvatar(user, size) {
    const url = this.server + '/api2/avatars/user/' + encodeURIComponent(user) + '/resized/' + size + '/';
    return this.req.get(url);
  }

  // ---- Notification API
  listAllNotifications(page, perPage) {
    const url = this.server + '/api/v2.1/all-notifications/';
    let params = {
      page: page,
      per_page: perPage
    };
    return this.req.get(url, { params: params });
  }

  updateAllNotifications() {
    const url = this.server + '/api/v2.1/all-notifications/';
    return this.req.put(url);
  }

  listNotifications(page, perPage) {
    const url = this.server + '/api/v2.1/notifications/';
    let params = {
      page: page,
      per_page: perPage
    };
    return this.req.get(url, { params: params });
  }


  listSdocNotifications(page, perPage) {
    const url = this.server + '/api/v2.1/sdoc-notifications/';
    let params = {
      page: page,
      per_page: perPage
    };
    return this.req.get(url, { params: params });
  }

  updateNotifications() {
    const url = this.server + '/api/v2.1/notifications/';
    return this.req.put(url);
  }

  updateSdocNotifications() {
    const url = this.server + '/api/v2.1/sdoc-notifications/';
    return this.req.put(url);
  }

  deleteNotifications() {
    const url = this.server + '/api/v2.1/notifications/';
    return this.req.delete(url);
  }

  deleteSdocNotifications() {
    const url = this.server + '/api/v2.1/sdoc-notifications/';
    return this.req.delete(url);
  }

  getUnseenNotificationCount() {
    const url = this.server + '/api/v2.1/notifications/';
    return this.req.get(url);
  }

  markNoticeAsRead(noticeId) {
    const url = this.server + '/api/v2.1/notification/';
    let from = new FormData();
    from.append('notice_id', noticeId);
    return this.req.put(url, from);
  }

  markSdocNoticeAsRead(noticeId) {
    const url = this.server + '/api/v2.1/sdoc-notification/';
    let from = new FormData();
    from.append('notice_id', noticeId);
    return this.req.put(url, from);
  }

  // ---- Linked Devices API
  listLinkedDevices() {
    const url = this.server + '/api2/devices/';
    return this.req.get(url);
  }

  unlinkDevice(platform, deviceID, wipeDevice) {
    const url = this.server + '/api2/devices/';
    let param = {
      platform: platform,
      device_id: deviceID,
      wipe_device: wipeDevice ? 'true' : 'false'
    };
    return this.req.delete(url, { data: param });
  }

  // ---- Activities API
  listActivities(pageNum, operationUser) {
    let url = this.server + '/api/v2.1/activities/?page=' + pageNum;
    if (operationUser) {
      url += '&op_user=' + encodeURIComponent(operationUser);
    }
    return this.req.get(url);
  }

  // ---- Thumbnail API
  createThumbnail(repo_id, path, thumbnail_size) {
    const url = this.server + '/thumbnail/' + repo_id + '/create/?path=' +
    encodeURIComponent(path) + '&size=' + thumbnail_size;
    return this.req.get(url, { headers: { 'X-Requested-With': 'XMLHttpRequest' } });
  }

  // ---- Users API
  searchUsers(searchParam) {
    const url = this.server + '/api2/search-user/?q=' + encodeURIComponent(searchParam);
    return this.req.get(url);
  }

  // ---- wiki module API
  listWikis(options) {
    /*
     * options: `{type: 'shared'}`, `{type: ['mine', 'shared', ...]}`
     */
    let url = this.server + '/api/v2.1/wikis/';
    if (!options) {
      // fetch all types of wikis
      return this.req.get(url);
    }
    return this.req.get(url, {
      params: options,
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

  addWiki(repoID) {
    const url = this.server + '/api/v2.1/wikis/';
    let form = new FormData();
    form.append('repo_id', repoID);
    return this._sendPostRequest(url, form);
  }

  renameWiki(slug, name) {
    const url = this.server + '/api/v2.1/wikis/' + slug + '/';
    let form = new FormData();
    form.append('wiki_name', name);
    return this._sendPostRequest(url, form);
  }

  updateWikiPermission(wikiSlug, permission) {
    const url = this.server + '/api/v2.1/wikis/' + wikiSlug + '/';
    let params = {
      permission: permission
    };
    return this.req.put(url, params);
  }

  deleteWiki(slug) {
    const url = this.server + '/api/v2.1/wikis/' + slug + '/';
    return this.req.delete(url);
  }

  // ----MetaData API
  fileMetaData(repoID, filePath) {
    const url = this.server + '/api2/repos/' + repoID + '/file/metadata/?p=' + encodeURIComponent(filePath);
    return this.req.get(url);
  }

  dirMetaData(repoID, dirPath) {
    const url = this.server + '/api2/repos/' + repoID + '/dir/metadata/?p=' + encodeURIComponent(dirPath);
    return this.req.get(url);
  }

  markdownLint(slateValue) {
    const url = this.server + '/api/v2.1/markdown-lint/';
    let form = new FormData();
    form.append('slate', slateValue);
    return this._sendPostRequest(url, form);
  }

  queryOfficeFileConvertStatus(repoID, commitID, path, fileType, shareToken) {
    const url = this.server + '/office-convert/status/';
    const params = {
      repo_id: repoID,
      commit_id: commitID,
      path: path,
      doctype: fileType // 'document' or 'spreadsheet'
    };
    // for view of share link
    if (shareToken) {
      params['token'] = shareToken;
    }
    return this.req.get(url, {
      headers: { 'X-Requested-With': 'XMLHttpRequest' },
      params: params
    });
  }

  listSharedDir(token, path, thumbnailSize) {
    const url = this.server + '/api/v2.1/share-links/' + token + '/dirents/';
    const params = {
      thumbnail_size: thumbnailSize,
      path: path
    };
    return this.req.get(url, {
      params: params
    });
  }

  getShareLinkZipTask(token, path) {
    const url = this.server + '/api/v2.1/share-link-zip-task/';
    const params = {
      share_link_token: token,
      path: path
    };
    return this.req.get(url, {
      params: params
    });
  }

  getShareLinkDirentsZipTask(token, path, dirents) {
    const url = this.server + '/api/v2.1/share-link-zip-task/';
    const params = {
      token: token,
      parent_dir: path,
      dirents: dirents
    };
    return this.req.post(url, params);
  }

  getShareLinkThumbnail(token, filePath, thumbnailSize) {
    const url = this.server + '/thumbnail/' + token + '/create/';
    const params = {
      path: filePath,
      size: thumbnailSize
    };
    return this.req.get(url, {
      params: params
    });
  }

  // get all existing repo snapshot labels of the user
  getAllRepoSnapshotLabels() {
    const url = this.server + '/api/v2.1/revision-tags/tag-names/';
    return this.req.get(url);
  }

  addNewRepoLabels(repoID, labels) {
    const url = this.server + '/api/v2.1/revision-tags/tagged-items/';
    const data = {
      'repo_id': repoID,
      'tag_names': labels
    };
    return this.req.post(url, data);
  }

  updateRepoCommitLabels(repoID, commitID, labels) {
    const url = this.server + '/api/v2.1/revision-tags/tagged-items/';
    const data = {
      'repo_id': repoID,
      'commit_id': commitID,
      'tag_names': labels
    };
    return this.req.put(url, data);
  }

  invitePeople(emails) {
    const url = this.server + '/api/v2.1/invitations/batch/';
    let form = new FormData();
    form.append('type', 'guest');
    for (let i = 0; i < emails.length; i++) {
      form.append('accepter', emails[i]);
    }
    return this._sendPostRequest(url, form);
  }

  listInvitations() {
    const url = this.server + '/api/v2.1/invitations/';
    return this.req.get(url);
  }

  deleteInvitation(token) {
    const url = this.server + '/api/v2.1/invitations/' + token + '/';
    return this.req.delete(url);
  }

  revokeInvitation(token) {
    const url = this.server + '/api/v2.1/invitations/' + token + '/revoke/';
    return this.req.post(url);
  }

  addRepoShareInvitations(repoID, path, emails, permission) {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/shared/invitations/batch/';
    const data = {
      type: 'guest',
      accepters: emails,
      path: path,
      permission: permission,
    };
    return this.req.post(url, data);
  }

  listRepoShareInvitations(repoID, path) {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/shared/invitations/?path=' + path;
    return this.req.get(url);
  }

  updateRepoShareInvitation(repoID, path, token, permission) {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/shared/invitation/';
    let data = { token: token, path: path, permission: permission };
    return this.req.put(url, data);
  }

  deleteRepoShareInvitation(repoID, path, token) {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/shared/invitation/';
    let params = { token: token, path: path };
    return this.req.delete(url, { data: params });
  }

  updateUserAvatar(avatarFile) {
    const url = this.server + '/api/v2.1/user-avatar/';
    let form = new FormData();
    form.append('avatar', avatarFile);
    return this._sendPostRequest(url, form);
  }

  getUserInfo() {
    const url = this.server + '/api/v2.1/user/';
    return this.req.get(url);
  }

  updateUserInfo({ name, telephone, contact_email, list_in_address_book }) {
    const url = this.server + '/api/v2.1/user/';
    let data = {};
    if (name != undefined) {
      data.name = name;
    }
    if (telephone != undefined) {
      data.telephone = telephone;
    }
    if (contact_email != undefined) {
      data.contact_email = contact_email;
    }
    if (list_in_address_book != undefined) {
      data.list_in_address_book = list_in_address_book;
    }
    return this.req.put(url, data);
  }

  updateEmailNotificationInterval(fileUpdatesEmailInterval, collaborateEmailInterval) {
    const url = this.server + '/api2/account/info/';
    const data = {
      'file_updates_email_interval': fileUpdatesEmailInterval,
      'collaborate_email_interval': collaborateEmailInterval,
    };
    return this.req.put(url, data);
  }

  updateWebdavSecret(password) {
    const url = this.server + '/api/v2.1/webdav-secret/';
    const data = {
      'secret': password
    };
    return this.req.put(url, data);
  }

  listUserFolderPerm(repoID, folderPath) {
    let url = this.server + '/api2/repos/' + repoID + '/user-folder-perm/';
    if (folderPath) {
      url = url + '?folder_path=' + encodeURIComponent(folderPath);
    }
    return this.req.get(url);
  }

  addUserFolderPerm(repoID, permission, folderPath, userEmail) {
    const url = this.server + '/api2/repos/' + repoID + '/user-folder-perm/';
    let form = new FormData();
    form.append('permission', permission);
    form.append('folder_path', folderPath);
    if (Array.isArray(userEmail)) {
      userEmail.forEach(item => {
        form.append('user_email', item);
      });
    } else {
      form.append('user_email', userEmail);
    }
    return this._sendPostRequest(url, form);
  }

  updateUserFolderPerm(repoID, permission, folderPath, userEmail) {
    const url = this.server + '/api2/repos/' + repoID + '/user-folder-perm/';
    let form = new FormData();
    form.append('permission', permission);
    form.append('folder_path', folderPath);
    form.append('user_email', userEmail);
    return this.req.put(url, form);
  }

  deleteUserFolderPerm(repoID, permission, folderPath, userEmail) {
    const url = this.server + '/api2/repos/' + repoID + '/user-folder-perm/';
    let param = {
      permission: permission,
      folder_path: folderPath,
      user_email: userEmail,
    };
    return this.req.delete(url, { data: param });
  }

  listGroupFolderPerm(repoID, folderPath) {
    let url = this.server + '/api2/repos/' + repoID + '/group-folder-perm/';
    if (folderPath) {
      url = url + '?folder_path=' + encodeURIComponent(folderPath);
    }
    return this.req.get(url);
  }

  addGroupFolderPerm(repoID, permission, folderPath, groupIDs) {
    const url = this.server + '/api2/repos/' + repoID + '/group-folder-perm/';
    let form = new FormData();
    form.append('permission', permission);
    form.append('folder_path', folderPath);
    groupIDs.forEach(item => {
      form.append('group_id', item);
    });
    return this._sendPostRequest(url, form);
  }

  updateGroupFolderPerm(repoID, permission, folderPath, groupID) {
    const url = this.server + '/api2/repos/' + repoID + '/group-folder-perm/';
    let form = new FormData();
    form.append('permission', permission);
    form.append('folder_path', folderPath);
    form.append('group_id', groupID);
    return this.req.put(url, form);
  }

  deleteGroupFolderPerm(repoID, permission, folderPath, groupID) {
    const url = this.server + '/api2/repos/' + repoID + '/group-folder-perm/';
    let param = {
      permission: permission,
      folder_path: folderPath,
      group_id: groupID,
    };
    return this.req.delete(url, { data: param });
  }

  listDepartmentRepoUserFolderPerm(repoID, folderPath) {
    let url = this.server + '/api/v2.1/group-owned-libraries/' + repoID + '/user-folder-permission/';
    if (folderPath) {
      url = url + '?folder_path=' + encodeURIComponent(folderPath);
    }
    return this.req.get(url);
  }

  addDepartmentRepoUserFolderPerm(repoID, permission, folderPath, userEmail) {
    const url = this.server + '/api/v2.1/group-owned-libraries/' + repoID + '/user-folder-permission/';
    let form = new FormData();
    form.append('permission', permission);
    form.append('folder_path', folderPath);
    if (Array.isArray(userEmail)) {
      userEmail.forEach(item => {
        form.append('user_email', item);
      });
    } else {
      form.append('user_email', userEmail);
    }
    return this._sendPostRequest(url, form);
  }

  updateDepartmentRepoUserFolderPerm(repoID, permission, folderPath, userEmail) {
    const url = this.server + '/api/v2.1/group-owned-libraries/' + repoID + '/user-folder-permission/';
    let form = new FormData();
    form.append('permission', permission);
    form.append('folder_path', folderPath);
    form.append('user_email', userEmail);
    return this.req.put(url, form);
  }

  deleteDepartmentRepoUserFolderPerm(repoID, permission, folderPath, userEmail) {
    const url = this.server + '/api/v2.1/group-owned-libraries/' + repoID + '/user-folder-permission/';
    let param = {
      permission: permission,
      folder_path: folderPath,
      user_email: userEmail,
    };
    return this.req.delete(url, { data: param });
  }

  listDepartmentRepoGroupFolderPerm(repoID, folderPath) {
    let url = this.server + '/api/v2.1/group-owned-libraries/' + repoID + '/group-folder-permission/';
    if (folderPath) {
      url = url + '?folder_path=' + encodeURIComponent(folderPath);
    }
    return this.req.get(url);
  }

  addDepartmentRepoGroupFolderPerm(repoID, permission, folderPath, groupIDs) {
    const url = this.server + '/api/v2.1/group-owned-libraries/' + repoID + '/group-folder-permission/';
    let form = new FormData();
    form.append('permission', permission);
    form.append('folder_path', folderPath);
    groupIDs.forEach(item => {
      form.append('group_id', item);
    });
    return this._sendPostRequest(url, form);
  }

  updateDepartmentRepoGroupFolderPerm(repoID, permission, folderPath, groupID) {
    const url = this.server + '/api/v2.1/group-owned-libraries/' + repoID + '/group-folder-permission/';
    let form = new FormData();
    form.append('permission', permission);
    form.append('folder_path', folderPath);
    form.append('group_id', groupID);
    return this.req.put(url, form);
  }

  deleteDepartmentRepoGroupFolderPerm(repoID, permission, folderPath, groupID) {
    const url = this.server + '/api/v2.1/group-owned-libraries/' + repoID + '/group-folder-permission/';
    let param = {
      permission: permission,
      folder_path: folderPath,
      group_id: groupID,
    };
    return this.req.delete(url, { data: param });
  }

  getRepoHistory(repoID, page, perPage) {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/history/';
    const params = {
      page: page || 1,
      per_page: perPage || 100
    };
    return this.req.get(url, { params: params });
  }

  getCommitDetails(repoID, commitID) {
    const url = this.server + '/ajax/repo/' + repoID + '/history/changes/';
    const params = {
      commit_id: commitID
    };
    return this.req.get(url, {
      headers: { 'X-Requested-With': 'XMLHttpRequest' },
      params: params
    });
  }

  getRepoFolderTrash(repoID, path, scanStat) {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/trash/';
    let params = {
      path: path
    };
    if (scanStat) {
      params.scan_stat = scanStat;
    }
    return this.req.post(url, params);
  }

  restoreDirents(repoID, commentID, paths) {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/trash/revert-dirents/';
    let formData = new FormData();
    paths.forEach(path => {
      formData.append('path', path);
    });
    formData.append('commit_id', commentID);
    return this._sendPostRequest(url, formData);
  }

  deleteRepoTrash(repoID, days) {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/trash/';
    const params = {
      keep_days: days
    };
    return this.req.delete(url, { data: params });
  }

  restoreFolder(repoID, commitID, path) {
    const url = this.server + '/api2/repos/' + repoID + '/dir/revert/';
    const data = {
      'commit_id': commitID,
      'p': path
    };
    return this.req.put(url, data);
  }

  restoreFile(repoID, commitID, path) {
    const url = this.server + '/api2/repos/' + repoID + '/file/revert/';
    const data = {
      'commit_id': commitID,
      'p': path
    };
    return this.req.put(url, data);
  }

  listCommitDir(repoID, commitID, path) {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/commits/' + commitID + '/dir/';
    const params = {
      path: path
    };
    return this.req.get(url, { params: params });
  }

  listRepoRelatedUsers(repoID) {
    let url = this.server + '/api/v2.1/repos/' + repoID + '/related-users/';
    return this.req.get(url);
  }

  listFileParticipants(repoID, filePath) {
    const path = encodeURIComponent(filePath);
    let url = this.server + '/api/v2.1/repos/' + repoID + '/file/participants/?path=' + path;
    return this.req.get(url);
  }

  addFileParticipants(repoID, filePath, emails) {
    let url = this.server + '/api/v2.1/repos/' + repoID + '/file/participants/';
    let params = {
      path: filePath,
      emails: emails
    };
    return this.req.post(url, params);
  }

  deleteFileParticipant(repoID, filePath, email) {
    let url = this.server + '/api/v2.1/repos/' + repoID + '/file/participant/';
    let params = {
      path: filePath,
      email: email
    };
    return this.req.delete(url, { data: params });
  }

  listOCMSharesPrepare(repoId) {
    let url = this.server + '/api/v2.1/ocm/shares-prepare/';
    if (repoId) {
      url += '?repo_id=' + repoId;
    }
    return this.req.get(url);
  }

  addOCMSharePrepare(toUser, toServerURL, repoId, path, permission) {
    let url = this.server + '/api/v2.1/ocm/shares-prepare/';
    let params = {
      'to_user': toUser,
      'to_server_url': toServerURL,
      'repo_id': repoId,
      'path': path,
      'permission': permission,
    };
    return this.req.post(url, params);
  }

  deleteOCMSharePrepare(id) {
    let url = this.server + '/api/v2.1/ocm/shares-prepare/' + id + '/';
    return this.req.delete(url);
  }

  listOCMSharesReceived() {
    let url = this.server + '/api/v2.1/ocm/shares-received/';
    return this.req.get(url);
  }

  deleteOCMShareReceived(id) {
    let url = this.server + '/api/v2.1/ocm/shares-received/' + id + '/';
    return this.req.delete(url);
  }

  listOCMRepoDir(providerID, repoID, path) {
    let url = this.server + '/api/v2.1/ocm/providers/' + providerID + '/repos/' + repoID + '/dir/?path=' + encodeURIComponent(path);
    return this.req.get(url);
  }

  getOCMRepoDownloadURL(providerID, repoID, path) {
    let url = this.server + '/api/v2.1/ocm/providers/' + providerID + '/repos/' + repoID + '/download-link/?path=' + encodeURIComponent(path);
    return this.req.get(url);
  }

  getOCMRepoUploadURL(providerID, repoID, path) {
    let url = this.server + '/api/v2.1/ocm/providers/' + providerID + '/repos/' + repoID + '/upload-link/?path=' + encodeURIComponent(path);
    return this.req.get(url);
  }

  getRepoOldFilesAutoDelDays(repoID) {
    let url = this.server + '/api/v2.1/repos/' + repoID + '/auto-delete/';
    return this.req.get(url);
  }

  setRepoOldFilesAutoDelDays(repoID, autoDelDays) {
    let url = this.server + '/api/v2.1/repos/' + repoID + '/auto-delete/';
    let formData = new FormData();
    formData.append('auto_delete_days', autoDelDays);
    return this.req.put(url, formData);
  }

  sdocCopyHistoryFile(repoID, path, objID, ctime) {
    const url = this.server + '/api/v2.1/seadoc/copy-history-file/' + repoID + '/';
    let form = new FormData();
    form.append('obj_id', objID);
    form.append('p', path);
    form.append('ctime', ctime);
    return this._sendPostRequest(url, form);
  }

  listSdocHistory(docUuid, page, perPage) {
    const url = this.server + '/api/v2.1/seadoc/history/' + docUuid + '/';
    const params = {
      page: page,
      per_page: perPage,
    };
    return this.req.get(url, { params: params });
  }

  listSdocDailyHistoryDetail(docUuid, opDate) {
    const url = this.server + '/api/v2.1/seadoc/daily-history-detail/' + docUuid + '/';
    const params = { op_date: opDate };
    return this.req.get(url, { params: params });
  }

  renameSdocHistory(docUuid, objID, newName) {
    const url = this.server + '/api/v2.1/seadoc/history/' + docUuid + '/';
    const data = {
      obj_id: objID,
      new_name: newName,
    };
    return this.req.post(url, data);
  }

  sdocStartRevise(repoID, path) {
    const url = this.server + '/api/v2.1/seadoc/revisions/';
    let form = new FormData();
    form.append('p', path);
    form.append('repo_id', repoID);
    return this._sendPostRequest(url, form);
  }

  sdocPublishRevision(docUuid) {
    const url = this.server + '/api/v2.1/seadoc/publish-revision/' + docUuid + '/';
    return this.req.post(url);
  }

  onlyofficeConvert(repoID, filePath) {
    const url = this.server + '/onlyoffice-api/convert/';
    let formData = new FormData();
    formData.append('repo_id', repoID);
    formData.append('file_path', filePath);
    return this._sendPostRequest(url, formData);
  }

  importSdoc(file, repoID, parentDir) {
    const url = this.server + '/api/v2.1/seadoc/import/' + repoID + '/';
    let formData = new FormData();
    formData.append('file', file);
    formData.append('parent_dir', parentDir);
    return this._sendPostRequest(url, formData);
  }

  sysAdminListFileTransferLogs(page, perPage) {
    const url = this.server + '/api/v2.1/admin/logs/repo-transfer-logs/';
    let params = {
      page: page,
      per_page: perPage
    };
    return this.req.get(url, { params: params });
  }

  sysAdminListGroupInviteLogs(page, perPage) {
    const url = this.server + '/api/v2.1/admin/logs/group-member-audit/';
    let params = {
      page: page,
      per_page: perPage
    };
    return this.req.get(url, { params: params });
  }

}

let seafileAPI = new SeafileAPI();
let xcsrfHeaders = cookie.load('sfcsrftoken');
seafileAPI.initForSeahubUsage({ siteRoot, xcsrfHeaders });

export { seafileAPI };
