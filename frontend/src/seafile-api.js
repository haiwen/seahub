var axios = require('axios');
var FormData = require('form-data');

class SeafileAPI {

  init({ server, username, password, token }) {
    this.server = server;
    this.username = username;
    this.password = password;
    this.token = token;  //none
    if (this.token && this.server) {
      this.req = axios.create({
        baseURL: this.server,
        headers: { 'Authorization': 'Token ' + this.token }
      });
    }
    return this;
  }

  initForSeahubUsage({ siteRoot, xcsrfHeaders }) {
    if (siteRoot && siteRoot.charAt(siteRoot.length-1) === "/") {
      var server = siteRoot.substring(0, siteRoot.length-1);
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
        headers:form.getHeaders()
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
    })
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
    })
  }

  authPing() {
    const url = this.server + '/api2/auth/ping/';
    return this.req.get(url);
  }

  //---- Account API

  getAccountInfo() {
    const url =  this.server + '/api2/account/info/';
    return this.req.get(url);
  }
  
  //---- Group operation

  listDepartments() {
    const url = this.server + '/api/v2.1/departments/';
    return this.req.get(url);
  }

  listGroups(withRepos = false) {
    let options = {with_repos: withRepos ? 1 : 0};
    const url = this.server + '/api/v2.1/groups/';
    return this.req.get(url, {params: options});
  }

  listGroupRepos(groupID) {
    const url = this.server + '/api/v2.1/groups/' + groupID + '/libraries/';
    return this.req.get(url);
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
    }
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
    }
    return this.req.put(url, params);
  }

  quitGroup(groupID, userName) {
    const name = encodeURIComponent(userName);
    const url = this.server + '/api/v2.1/groups/' + groupID + '/members/' + name + '/';
    return this.req.delete(url);
  }

  listGroupMembers(groupID, isAdmin=false, avatarSize=64) {
    let url = this.server + '/api/v2.1/groups/' + groupID + '/members/?avatar_size=' + avatarSize + '&is_admin=' + isAdmin;
    return this.req.get(url);
  }

  addGroupMember(groupID, userName) {
    const url = this.server + '/api/v2.1/groups/' + groupID + '/members/';
    const params = {
      email: userName
    }
    return this.req.post(url, params);
  }

  addGroupMembers(groupID, userNames) {
    const url = this.server + '/api/v2.1/groups/' + groupID + '/members/bulk/';
    let form = new FormData();
    form.append('emails', userNames.join(','));
    return this._sendPostRequest(url, form);
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
    }
    return this.req.put(url, params);
  }

  createGroupOwnedLibrary(groupID, repo) {
    let repoName = repo.repo_name;
    let permission = repo.permission ? repo.permission : 'rw';
    const url = this.server + '/api/v2.1/groups/'+ groupID + '/group-owned-libraries/';
    let form = new FormData();
    form.append('name', repoName);  // need to modify endpoint api;
    if (repo.passwd) {
      form.append("passwd", repo.passwd);
    }
    form.append('permission', permission);
    return this._sendPostRequest(url, form);
  }
  
  deleteGroupOwnedLibrary(groupID, repoID) {
    const url = this.server + '/api/v2.1/groups/'+ groupID + '/group-owned-libraries/' + repoID+ '/';
    return this.req.delete(url);
  }

  renameGroupOwnedLibrary(groupID, repoID, newName) {
    const url = this.server + '/api/v2.1/groups/'+ groupID + '/group-owned-libraries/' + repoID + '/';
    let form = new FormData();
    form.append('name', newName);
    return this.req.put(url, form);
  }
  
  shareGroupOwnedRepoToUser(repoID, permission, username, path) {
    const url = this.server + '/api/v2.1/group-owned-libraries/' + repoID + '/user-share/'
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

  modifyGroupOwnedRepoUserSharedPermission(repoID, permission, username, path) { //need check
    const url = this.server + '/api/v2.1/group-owned-libraries/' + repoID + '/user-share/'
    let form = new FormData();
    form.append('permission', permission);
    form.append('username', username);
    form.append('path', path);
    return this.req.put(url, form);
  }

  deleteGroupOwnedRepoSharedUserItem(repoID, username, path) {
    const url = this.server + '/api/v2.1/group-owned-libraries/' + repoID + '/user-share/'
    let params = {username: username, path: path};
    return this.req.delete(url, {data: params});
  }

  shareGroupOwnedRepoToGroup(repoID, permission, groupID, path) {
    const url = this.server + '/api/v2.1/group-owned-libraries/' + repoID + '/group-share/'
    let form = new FormData();
    form.append('permission', permission);
    form.append('path', path);
    if (Array.isArray(groupID)) {
      groupID.forEach(item => {
        form.append('group_id', item);
      });
    } else {
      form.append('group_id', groupID);
    }
    return this._sendPostRequest(url, form);
  }

  modifyGroupOwnedRepoGroupSharedPermission(repoID, permission, groupID, path) { //need check
    const url = this.server + '/api/v2.1/group-owned-libraries/' + repoID + '/group-share/'
    let form = new FormData();
    form.append('permission', permission);
    form.append('group_id', groupID);
    form.append('path', path);
    return this.req.put(url, form);
  }

  deleteGroupOwnedRepoSharedGroupItem(repoID, groupID, path) {
    const url = this.server + '/api/v2.1/group-owned-libraries/' + repoID + '/group-share/'
    let params = {group_id: groupID, path: path};
    return this.req.delete(url, {data: params});
  }

  //---- share operation

  // share-link
  listUserShareLinks() {
    const url = this.server + '/api/v2.1/share-links/';
    return this.req.get(url);
  }

  getShareLink(repoID, filePath) { //list folder(file) links
    const path = encodeURIComponent(filePath);
    const url = this.server + '/api/v2.1/share-links/?repo_id=' + repoID + '&path=' + path;
    return this.req.get(url);
  }

  createShareLink(repoID, path, password, expireDays, permissions) {
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
    if (expireDays) {
      form.append('expire_days', expireDays);
    }
    return this._sendPostRequest(url, form);
  }

  updateShareLink(token, permissions) {
    var url = this.server + '/api/v2.1/share-links/' + token + '/';
    let form = new FormData();
    form.append('permissions', permissions);
    return this.req.put(url, form);
  }

  deleteShareLink(token) {
    const url = this.server + '/api/v2.1/share-links/' + token + '/';
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

  // upload-link
  listUserUploadLinks() {
    const url = this.server + '/api/v2.1/upload-links/';
    return this.req.get(url);
  }
  
  getUploadLink(repoID, path) {
    const url = this.server + '/api/v2.1/upload-links/?repo_id=' + repoID + '&path=' + encodeURIComponent(path);
    return this.req.get(url);
  }

  createUploadLink(repoID, path, password, expireDays) {
    const url = this.server + '/api/v2.1/upload-links/';
    let form = new FormData();
    form.append('path', path);
    form.append('repo_id', repoID);
    if (password) {
      form.append('password', password);
    }
    if (expireDays) {
      form.append('expire_days', expireDays);
    }
    return this._sendPostRequest(url, form);
  }

  deleteUploadLink(token) {
    const url = this.server + '/api/v2.1/upload-links/' + token + '/';
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

  getBeSharedRepos() { //listBeSharedRepos
    const url = this.server + '/api2/beshared-repos/';
    return this.req.get(url);
  }

  leaveShareRepo(repoID, options) { // deleteBeSharedRepo
    const url = this.server + '/api2/beshared-repos/' + repoID + '/';
    return this.req.delete(url, {params: options});
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
    return this.req.delete(url, {params: options});
  }

  unshareRepoToGroup(repoID, groupID) {
    const url = this.server + '/api/v2.1/groups/' + groupID + '/libraries/' + repoID +'/';
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
    return this.req.post(url, data, {params: options}); // due to the old api, use 'post' here
  }

  unshareFolder(repoID, options) {
    const url = this.server + '/api2/repos/' + repoID + '/dir/shared_items/';
    return this.req.delete(url, {params: options});
  }

  //---- repo(library) operation 
  createMineRepo(repo) {
    const url = this.server + '/api2/repos/?from=web';
    return this.req.post(url, repo);
  }
  
  createGroupRepo(groupID, repo) {
    const url = this.server + '/api/v2.1/groups/'+ groupID + '/libraries/';
    let form = new FormData();
    form.append("repo_name", repo.repo_name);
    if (repo.password) {
      form.append("password", repo.password);
    }
    form.append("permission", repo.permission);
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
      paramsSerializer: function(params) {
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

  getSource() {   // for search
    let CancelToken = axios.CancelToken;
    let source = CancelToken.source();
    return source;
  }

  searchFilesInPublishedRepo(repoID, q, page, perPage) {
    const url = this.server + '/api/v2.1/published-repo-search/';
    let params = {
      repo_id: repoID,
      q: q,
      page: page,
      per_page: perPage
    };
    return this.req.get(url, {params: params});
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
    if (searchParams.with_permission){url = url + '&with_permission=' + searchParams.with_permission;}
    if (searchParams.time_from) {url = url + '&time_from=' + searchParams.time_from;}
    if (searchParams.time_to) {url = url + '&time_to=' + searchParams.time_to;}
    if (searchParams.size_from) {url = url + '&size_from=' + searchParams.size_from;}
    if (searchParams.size_to) {url = url + '&size_to=' + searchParams.size_to;}
    if (searchParams.shared_from) {url = url + '&shared_from=' + searchParams.shared_from;}
    if (searchParams.not_shared_from) {url = url + '&not_shared_from=' + searchParams.not_shared_from;}
    if (searchParams.ftype) {
      for (let i= 0; i< searchParams.ftype.length; i++){
        url = url + '&ftype=' + searchParams.ftype[i];}
    }
    return this.req.get(url, {cancelToken : cancelToken});
  }

  listRepoAPITokens(repo_id) {
    console.log('server in function is: ', this.server);
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

  //admin 
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

  //---- directory operation
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
    return this.req.get(url, {params: params});
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
    const url =  this.server + '/api2/repos/' + repoID + '/dir/?p=' + path;
    let form = new FormData();
    form.append('operation', 'mkdir');
    return this._sendPostRequest(url, form);
  }

  renameDir(repoID, dirPath, newdirName) {
    const path = encodeURIComponent(dirPath);
    const url = this.server + '/api2/repos/' + repoID + '/dir/?p=' + path;
    let form = new FormData();
    form.append("operation", 'rename');
    form.append("newname", newdirName);
    return this._sendPostRequest(url, form);
  }

  deleteDir(repoID, dirPath) {
    const path = encodeURIComponent(dirPath);
    const url = this.server + '/api/v2.1/repos/' +  repoID + '/dir/?p=' + path;
    return this.req.delete(url);
  }

  //---- multiple(File&Folder) operation
  copyDir(repoID, dstrepoID, dstfilePath, dirPath, direntNames) {
    let paths = [];
    let url = this.server;
    url += repoID === dstrepoID ? '/api/v2.1/repos/sync-batch-copy-item/' : '/api/v2.1/repos/async-batch-copy-item/';
    if (Array.isArray(direntNames)) {
      paths = direntNames;
    } else {
      paths.push(direntNames)
    } 
    let operation = {
      'src_repo_id': repoID,
      'src_parent_dir': dirPath,
      'dst_repo_id': dstrepoID,
      'dst_parent_dir': dstfilePath,
      'src_dirents': paths
    }

    return this._sendPostRequest(url, operation, {headers: {'Content-Type': 'application/json'}});
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
    }

    return this._sendPostRequest(url, operation, {headers: {'Content-Type': 'application/json'}});
  }

  queryAsyncOperationProgress(task_id) {
    const url = this.server + '/api/v2.1/query-copy-move-progress/?task_id=' + task_id;
    return this.req.get(url);
  }

  deleteMutipleDirents(repoID, parentDir, direntNames) {
    const url = this.server  + '/api/v2.1/repos/batch-delete-item/';
    let operation = {
      'repo_id': repoID,
      'parent_dir': parentDir,
      'dirents': direntNames
    };
    return this.req.delete(url, {data: operation}, {headers: {'Content-Type': 'application/json'}});
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
    const url = this.server  + '/api/v2.1/query-zip-progress/?token=' + zip_token;
    return this.req.get(url);
  }

  cancelZipTask(zip_token) {
    const url = this.server + '/api/v2.1/cancel-zip-task/';
    const form = new FormData();
    form.append("token", zip_token);
    return this.req.post(url, form);
  }

  //---- File Operation
  getFileInfo(repoID, filePath) {
    const path = encodeURIComponent(filePath);
    const url = this.server + '/api2/repos/' + repoID + '/file/detail/?p=' + path;
    return this.req.get(url);
  }

  getFileHistory(repoID, folderPath) {
    const url = this.server + "/api2/repos/" + repoID + "/file/history/?p=" + encodeURIComponent(folderPath);
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

  lockfile(repoID, filePath) {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/file/?p=' + encodeURIComponent(filePath);
    let form = new FormData();
    form.append('operation', 'lock');
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
    const url = this.server +  '/api/v2.1/repos/'+ repoID + '/file/?p=' + encodeURIComponent(path);
    let form = new FormData();
    form.append("operation", 'revert');
    form.append("commit_id", commitID);
    return this._sendPostRequest(url, form);
  }

  revertFolder(repoID, path, commitID) {
    const url = this.server +  '/api/v2.1/repos/'+ repoID + '/dir/?p=' + encodeURIComponent(path);
    let form = new FormData();
    form.append("operation", 'revert');
    form.append("commit_id", commitID);
    return this._sendPostRequest(url, form);
  }

  revertRepo(repoID, commitID) {
    const url = this.server +  '/api/v2.1/repos/'+ repoID + '/commits/' + commitID + '/revert/';
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

  getFileUploadedBytes(repoID, filePath, fileName) {
    let url = this.server + '/api/v2.1/repos/' + repoID + '/file-uploaded-bytes/';
    let params = {
      parent_dir: filePath,
      file_name: fileName,
    };
    return this.req.get(url, {params: params});
  }

  uploadImage (uploadLink, formData, onUploadProgress = null) {
    return (
      axios.create()({
        method: "post",
        data: formData,
        url: uploadLink,
        onUploadProgress: onUploadProgress
      })
    );
  }

  getUpdateLink(repoID, folderPath) {
    const url = this.server + '/api2/repos/' + repoID + '/update-link/?p=' + encodeURIComponent(folderPath);
    return this.req.get(url)
  }

  updateFile(uploadLink, filePath, fileName, data) {
    let formData = new FormData();
    formData.append("target_file", filePath);
    formData.append("filename", fileName);
    let blob = new Blob([data], { type: "text/plain" });
    formData.append("file", blob);
    return (
      axios.create()({
        method: 'post',
        url: uploadLink,
        data: formData,
      })
    );
  }

  listFileHistoryRecords(repoID, path, page, per_page) {
    const url = this.server +  '/api/v2.1/repos/'+ repoID + '/file/new_history/';
    const params = {
      path: path,
      page: page,
      per_page: per_page,
    }
    return this.req.get(url, {params: params});
  }

  listOldFileHistoryRecords(repoID, path, commitID) {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/file/history/';
    const params = {
      path: path,
      commit_id: commitID,
    };
    return this.req.get(url, {params: params});
  }

  getFileRevision(repoID, commitID, filePath) {
    let url = this.server + '/api2/' + 'repos/' + repoID + '/file' + '/revision/?p=' + encodeURIComponent(filePath) + '&commit_id=' + commitID
    return this.req.get(url);
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
    form.append("comment", comment);
    if (detail) {
      form.append("detail", detail);
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

  getRepoDraftCounts(repoID) {
    const url = this.server + '/api/v2.1/repo/' + repoID + '/draft-counts/'
    return this.req.get(url);
  }

  listRepoDrafts(repoID) {
    const url = this.server + '/api/v2.1/repo/' + repoID + '/drafts/';
    return this.req.get(url); 
  }

  // draft operation api
  getDraft(id) {
    const url = this.server + '/api/v2.1/drafts/' + id + '/';
    return this.req.get(url)
  }

  listDrafts() {
    const url = this.server + '/api/v2.1/drafts';
    return this.req.get(url);
  }

  createDraft(repoID, filePath) {
    const url = this.server + '/api/v2.1/drafts/';
    const form = new FormData();
    form.append("repo_id", repoID);
    form.append("file_path", filePath);
    return this.req.post(url, form);
  }

  deleteDraft(id) {
    const url = this.server + '/api/v2.1/drafts/' + id + '/';
    return this.req.delete(url);
  }

  publishDraft(id) {
    const url = this.server + '/api/v2.1/drafts/' + id + '/';
    const params = {
      operation: 'publish'
    }
    return this.req.put(url, params);
  }

  // review api
  listDraftReviewers(draftID) {
    const url = this.server + '/api/v2.1/drafts/' + draftID + '/reviewer/';
    return this.req.get(url);
  }

  addDraftReviewers(draftID, reviewers) {
    const url = this.server + '/api/v2.1/drafts/' + draftID + '/reviewer/';
    let form = new FormData();
    for(let i = 0 ; i < reviewers.length ; i ++) {
      form.append('reviewer', reviewers[i]);
    }
    return this._sendPostRequest(url, form);
  }

  deleteDraftReviewer(draftID, reviewer) {
    const url = this.server + '/api/v2.1/drafts/' + draftID + '/reviewer/?username=' + encodeURIComponent(reviewer);
    return this.req.delete(url);
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

  //---- tags module api
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
    var p = encodeURIComponent(filePath)
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

  //---- RelatedFile API
  listRelatedFiles(repoID, filePath) {
    const p = encodeURIComponent(filePath);
    const url = this.server + '/api/v2.1/related-files/?repo_id=' + repoID + '&file_path=' + p;
    return this.req.get(url);
  }

  addRelatedFile(oRepoID, rRepoID, oFilePath, rFilePath) {
    const form = new FormData();
    form.append('o_repo_id', oRepoID);
    form.append('r_repo_id', rRepoID);
    form.append('o_path', oFilePath);
    form.append('r_path', rFilePath);
    const url = this.server + '/api/v2.1/related-files/';
    return this._sendPostRequest(url, form);
  }

  deleteRelatedFile(repoID, filePath, relatedID) {
    const url = this.server + '/api/v2.1/related-files/' + relatedID + '/';
    const params = {
      repo_id: repoID,
      file_path: filePath
    };
    return this.req.delete(url, { data: params });
  }

  saveSharedFile(repoID, filePath, sharedToken) {
    const url = this.server + '/share/link/save/?t=' + sharedToken;
    let form = new FormData();
    form.append('dst_repo', repoID);
    form.append('dst_path', filePath);
    form.append('s_token', sharedToken);
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
    return this.req.get(url)
  }

  //---- Avatar API
  getUserAvatar(user, size) {
    const url = this.server + '/api2/avatars/user/' + encodeURIComponent(user) + '/resized/' + size +'/';
    return this.req.get(url);
  }

  //---- Notification API
  listPopupNotices(page, perPage) {
    const url = this.server + '/api/v2.1/notifications/';
    let form = new FormData();
    form.append('page', page);
    form.append('per_page', perPage);
    return this.req.get(url, form);
  }
  
  updateNotifications() {
    const url = this.server + '/api/v2.1/notifications/';
    return this.req.put(url);
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

  //---- Linked Devices API
  listLinkedDevices() {
    const url = this.server + '/api2/devices/';
    return this.req.get(url);
  }
  
  unlinkDevice(platform, device_id) {
    const url = this.server + "/api2/devices/";
    let param = {
      platform: platform,
      device_id: device_id
    };
    return this.req.delete(url, {data: param});
  }
  
  //---- Activities API
  listActivities(pageNum, avatarSize=36) {
    const url = this.server + '/api/v2.1/activities/?page=' + pageNum + '&avatar_size=' + avatarSize;
    return this.req.get(url);
  }

  //---- Thumbnail API
  createThumbnail(repo_id, path, thumbnail_size) {
    const url = this.server + '/thumbnail/' + repo_id + '/create/?path=' +
    encodeURIComponent(path) + '&size=' + thumbnail_size;
    return this.req.get(url, {headers: {'X-Requested-With': 'XMLHttpRequest'}});
  }

  //---- Users API
  searchUsers(searchParam) {
    const url = this.server + '/api2/search-user/?q=' + encodeURIComponent(searchParam);
    return this.req.get(url);
  }

  //---- wiki module API
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
      paramsSerializer: function paramsSerializer(params) {
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

  //----MetaData API
  fileMetaData(repoID, filePath) {
    const url = this.server + '/api2/repos/' + repoID + '/file/metadata/?p=' + encodeURIComponent(filePath);
    return this.req.get(url);
  }

  dirMetaData(repoID, dirPath) {
    const url = this.server + '/api2/repos/' + repoID + '/dir/metadata/?p=' + encodeURIComponent(dirPath);
    return this.req.get(url);
  }

  // single org admin api
  orgAdminGetOrgInfo() {
    const url = this.server + '/api/v2.1/org/admin/info/';
    return this.req.get(url);
  }

  orgAdminListOrgUsers(orgID, isStaff, page) {
    const url = this.server + '/api/v2.1/org/' + orgID +  '/admin/users/?is_staff=' + isStaff + '&page=' + page;
    return this.req.get(url);
  }

  orgAdminGetOrgUserBesharedRepos(orgID, email) {
    const url = this.server + '/api/v2.1/org/' + orgID + '/admin/users/'+ encodeURIComponent(email) + '/beshared-repos/';
    return this.req.get(url);
  }

  orgAdminGetOrgUserOwnedRepos(orgID, email) {
    const url = this.server + '/api/v2.1/org/' + orgID + '/admin/users/'+ encodeURIComponent(email) + '/repos/';
    return this.req.get(url);
  }

  orgAdminGetOrgUserInfo(orgID, email) {
    const url = this.server + '/api/v2.1/org/' + orgID + '/admin/users/'+ encodeURIComponent(email) + '/';
    return this.req.get(url);
  }

  orgAdminSetOrgUserName(orgID, email, name) {
    const url = this.server + '/api/v2.1/org/' + orgID + '/admin/users/'+ encodeURIComponent(email) + '/';
    const data = {
      name: name
    };
    return this.req.put(url, data);
  }

  orgAdminSetOrgUserContactEmail(orgID, email, contactEmail) {
    const url = this.server + '/api/v2.1/org/' + orgID + '/admin/users/'+ encodeURIComponent(email) + '/';
    const data = {
      contact_email: contactEmail
    };
    return this.req.put(url, data);
  }

  orgAdminSetOrgUserQuota(orgID, email, quota) {
    const url = this.server + '/api/v2.1/org/' + orgID + '/admin/users/'+ encodeURIComponent(email) + '/';
    const data = {
      quota_total: quota
    };
    return this.req.put(url, data);
  }

  orgAdminDeleteOrgUser(orgID, email) {
    const url = this.server + '/api/v2.1/org/' + orgID + '/admin/users/'+ encodeURIComponent(email) + '/';
    return this.req.delete(url);
  }

  orgAdminResetOrgUserPassword(orgID, email) {
    const url = this.server + '/api/v2.1/org/' + orgID + '/admin/users/'+ encodeURIComponent(email) + '/set-password/';
    return this.req.put(url);
  }

  orgAdminChangeOrgUserStatus(userID, statusCode) {
    const url = this.server + '/org/useradmin/toggle_status/' + userID + '/';
    let form = new FormData();
    form.append('s', statusCode);
    return this.req.post(url, form, { headers: {'X-Requested-With': 'XMLHttpRequest'}});
  }

  orgAdminAddOrgUser(orgID, email, name, password) {
    const url =  this.server + '/api/v2.1/org/' + orgID +'/admin/users/';
    let form = new FormData();
    form.append('email', email);
    form.append('name', name);
    form.append('password', password);
    return this._sendPostRequest(url, form);
  }

  orgAdminSetOrgAdmin(orgID, email, isStaff) {
    const url = this.server + '/api/v2.1/org/' + orgID +  '/admin/users/' + encodeURIComponent(email) + '/';
    let form = new FormData();
    form.append('is_staff', isStaff)
    return this.req.put(url, form);
  }

  orgAdminListOrgGroups(orgID, page) {
    const url = this.server + '/api/v2.1/org/' + orgID +  '/admin/groups/?page=' + page;
    return this.req.get(url);
  }

  orgAdminGetGroup(orgID, groupID) {
    const url = this.server + '/api/v2.1/org/' + orgID +  '/admin/groups/' + groupID + '/';
    return this.req.get(url);
  }

  orgAdminDeleteOrgGroup(orgID, groupID) {
    const url = this.server + '/api/v2.1/org/' + orgID +  '/admin/groups/' + groupID + '/';
    return this.req.delete(url);
  }

  orgAdminListOrgRepos(orgID, page) {
    const url = this.server + '/api/v2.1/org/' + orgID +  '/admin/repos/?page=' + page;
    return this.req.get(url);
  }

  orgAdminDeleteOrgRepo(orgID, repoID) {
    const url = this.server + '/api/v2.1/org/' + orgID +  '/admin/repos/' + repoID + '/';
    return this.req.delete(url);
  }

  orgAdminTransferOrgRepo(orgID, repoID, email) {
    const url = this.server + '/api/v2.1/org/' + orgID +  '/admin/repos/' + repoID + '/';
    let form = new FormData();
    form.append('email', email);
    return this.req.put(url, form);
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
    const url = this.server + '/api/v2.1/org/' + orgID + '/admin/groups/' + groupID + '/group-owned-libraries/' + repoID;
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

  orgAdminAddGroupMember(orgID, groupID, userEmail) {
    const url = this.server + '/api/v2.1/org/' + orgID + '/admin/groups/' + groupID +  '/members/';
    let form = new FormData();
    form.append('email', userEmail);
    return this._sendPostRequest(url, form);
  }

  orgAdminSetGroupMemberRole(orgID, groupID, userEmail, isAdmin) {
    const url = this.server + '/api/v2.1/org/' + orgID + '/admin/groups/' + groupID +  '/members/' + encodeURIComponent(userEmail) + '/';
    let form = new FormData();
    form.append('is_admin', isAdmin);
    return this.req.put(url, form);
  }
  
  // org admin logs
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
    return this.req.get(url, { headers: {'X-Requested-With': 'XMLHttpRequest'}});
  }

  markdownLint(slateValue) {
    const url = this.server + '/api/v2.1/markdown-lint/';
    let form = new FormData();
    form.append('slate', slateValue);
    return this._sendPostRequest(url, form);
  }

  listFileScanRecords() {
    const url = this.server + '/api/v2.1/admin/file-scan-records/';
    return this.req.get(url);
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
      headers: {'X-Requested-With': 'XMLHttpRequest'},
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
    let data = {token: token, path: path, permission: permission};
    return this.req.put(url, data);
  }

  deleteRepoShareInvitation(repoID, path, token) {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/shared/invitation/';
    let params = {token: token, path: path};
    return this.req.delete(url, {data: params});
  }

  updateUserAvatar(avatarFile, avatarSize) {
    const url = this.server + '/api/v2.1/user-avatar/';
    let form = new FormData();
    form.append('avatar', avatarFile);
    form.append('avatar_size', avatarSize);
    return this._sendPostRequest(url, form);
  }

  getUserInfo() {
    const url = this.server + '/api/v2.1/user/';
    return this.req.get(url);
  }

  updateUserInfo({name, telephone, contact_email, list_in_address_book}) {
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

  updateEmailNotificationInterval(interval) {
    const url = this.server + '/api2/account/info/';
    const data = {
      'email_notification_interval': interval
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
    return this.req.delete(url, {data: param});
  }

  listGroupFolderPerm(repoID, folderPath) {
    let url = this.server + '/api2/repos/' + repoID + '/group-folder-perm/';
    if (folderPath) {
      url = url + '?folder_path=' + encodeURIComponent(folderPath);
    }
    return this.req.get(url);
  }

  addGroupFolderPerm(repoID, permission, folderPath, groupID) {
    const url = this.server + '/api2/repos/' + repoID + '/group-folder-perm/';
    let form = new FormData();
    form.append('permission', permission);
    form.append('folder_path', folderPath);
    form.append('group_id', groupID);
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
    return this.req.delete(url, {data: param});
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
    return this.req.delete(url, {data: param});
  }

  listDepartmentRepoGroupFolderPerm(repoID, folderPath) {
    let url = this.server + '/api/v2.1/group-owned-libraries/' + repoID + '/group-folder-permission/';
    if (folderPath) {
      url = url + '?folder_path=' + encodeURIComponent(folderPath);
    }
    return this.req.get(url);
  }

  addDepartmentRepoGroupFolderPerm(repoID, permission, folderPath, groupID) {
    const url = this.server + '/api/v2.1/group-owned-libraries/' + repoID + '/group-folder-permission/';
    let form = new FormData();
    form.append('permission', permission);
    form.append('folder_path', folderPath);
    form.append('group_id', groupID);
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
    return this.req.delete(url, {data: param});
  }

  adminListWorkWeixinDepartments(departmentID) {
    const url = this.server + '/api/v2.1/admin/work-weixin/departments/';
    const params = {};
    if (departmentID) {
      params.department_id = departmentID;
    }
    return this.req.get(url, {params: params});
  }

  adminListWorkWeixinDepartmentMembers(departmentID, params) {
    const url = this.server + '/api/v2.1/admin/work-weixin/departments/' + departmentID + '/members/';
    return this.req.get(url, {params: params});
  }

  adminAddWorkWeixinUsersBatch(userList) {
    const url = this.server + '/api/v2.1/admin/work-weixin/users/batch/';
    return this.req.post(url, {userlist: userList});
  }

  adminImportWorkWeixinDepartment(departmentID) {
    const url = this.server + '/api/v2.1/admin/work-weixin/departments/import/';
    return this.req.post(url, {work_weixin_department_id: departmentID});
  }

  adminListDingtalkDepartments(departmentID) {
    const url = this.server + '/api/v2.1/admin/dingtalk/departments/';
    const params = {};
    if (departmentID) {
      params.department_id = departmentID;
    }
    return this.req.get(url, {params: params});
  }

  adminListDingtalkDepartmentMembers(departmentID) {
    const url = this.server + '/api/v2.1/admin/dingtalk/departments/' + departmentID + '/members/';
    return this.req.get(url);
  }

  adminAddDingtalkUsersBatch(userList) {
    const url = this.server + '/api/v2.1/admin/dingtalk/users/batch/';
    return this.req.post(url, {userlist: userList});
  }

  adminImportDingtalkDepartment(departmentID) {
    const url = this.server + '/api/v2.1/admin/dingtalk/departments/import/';
    return this.req.post(url, {department_id: departmentID});
  }

  getRepoHistory(repoID, page, perPage) {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/history/';
    const params = {
      page: page || 1,
      per_page: perPage || 100
    };
    return this.req.get(url, {params: params});
  }

  getCommitDetails(repoID, commitID) {
    const url = this.server + '/ajax/repo/' + repoID + '/history/changes/';
    const params = {
      commit_id: commitID
    };
    return this.req.get(url, {
      headers: {'X-Requested-With': 'XMLHttpRequest'},
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
    return this.req.get(url, {params: params});
  }

  deleteRepoTrash(repoID, days) {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/trash/';
    const params = {
      keep_days: days
    };
    return this.req.delete(url, {data: params});
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
    return this.req.get(url, {params: params});
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
    return this.req.get(url, {params: params});
  }

  sysAdminUnlinkDevice(platform, deviceID, user, wipeDevice) {
    const url = this.server + '/api/v2.1/admin/devices/';
    let params = {
      platform: platform,
      device_id: deviceID,
      user: user
    };
    if (wipeDevice) {
      params.wipe_device = wipeDevice
    }
    return this.req.delete(url, {data: params});
  }

  sysAdminListDeviceErrors() {
    const url = this.server + '/api/v2.1/admin/device-errors/';
    return this.req.get(url);
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

  sysAdminListAllRepos(page, perPage) {
    const url = this.server + '/api/v2.1/admin/libraries/';
    let params = {
      page: page,
      per_page: perPage
    };
    return this.req.get(url, {params: params});
  }

  sysAdminSearchRepos(name) {
    const url = this.server + '/api/v2.1/admin/search-library/';
    let params = {
      query: name || ''
    };
    return this.req.get(url, {params: params});
  }

  sysAdminGetSystemRepoInfo() {
    const url = this.server + '/api/v2.1/admin/system-library/';
    return this.req.get(url);
  }

  sysAdminDeleteRepo(repoID) {
    const url = this.server + '/api/v2.1/admin/libraries/' + repoID + '/';
    return this.req.delete(url);
  }

  sysAdminTransferRepo(repoID, userEmail) {
    const url = this.server + '/api/v2.1/admin/libraries/' + repoID + '/';
    const params = {
      owner: userEmail
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
    return this.req.get(url, {params: params});
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
    shareToList.map((shareTo) => {
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
    return this.req.delete(url, {data: params});
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
    return this.req.get(url, {params: params});
  }

  sysAdminSearchTrashRepos(owner) {
    const url = this.server + '/api/v2.1/admin/trash-libraries/';
    let params = {
      owner: owner || '' 
    };
    return this.req.get(url, {params: params});
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
    return this.req.get(url, {params: params});
  }

  sysAdminDeleteRepoDirent(repoID, path) {
    const url = this.server + '/api/v2.1/admin/libraries/' + repoID + '/dirent/';
    let params = {
      path: path
    };
    return this.req.delete(url, {params: params});
  }

  sysAdminGetRepoFileDownloadURL(repoID, path) {
    const url = this.server + '/api/v2.1/admin/libraries/' + repoID + '/dirent/';
    let params = {
      path: path,
      dl: 1
    };
    return this.req.get(url, {params: params}); 
  }

  sydAdminGetSysRepoItemUploadURL(path) {
    const url = this.server + '/api/v2.1/admin/system-library/upload-link/?from=web';
    let params = {
      path: path
    };
    return this.req.get(url, {params: params}); 
  }

  sysAdminGetSysRepoItemInfo(repoID, path) {
    const url = this.server + '/api/v2.1/admin/libraries/' + repoID + '/dirent/';
    let params = {
      path: path
    };
    return this.req.get(url, {params: params}); 
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
    return this.req.get(url, {params: params});
  }

  sysAdminSearchGroups(name) {
    const url = this.server + '/api/v2.1/admin/search-group/';
    let params = {
      query: name
    };
    return this.req.get(url, {params: params});
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

  sysAdminListGroupMembers(groupID) {
    const url = this.server + '/api/v2.1/admin/groups/' + groupID + '/members/';
    return this.req.get(url);
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

  sysAdminListAllShareLinks(page, perPage) {
    const url = this.server + '/api/v2.1/admin/share-links/';
    let params = {
      page: page,
      per_page: perPage
    };
    return this.req.get(url, {params: params});
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
    return this.req.get(url, {params: params});
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
    return this.req.get(url, {params: params});
  }

  sysAdminSearchOrgs(name) {
    let url = this.server + '/api/v2.1/admin/search-organization/';
    let params = {
      query: name
    };
    return this.req.get(url, {params: params});
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

  sysAdminAddOrgUser(orgID, email, name, password) {
    const url = this.server + '/api/v2.1/admin/organizations/' + orgID + '/users/';
    let formData = new FormData();
    formData.append('email', email);
    formData.append('name', name);
    formData.append('password', password);
    return this._sendPostRequest(url, formData);
  }

  sysAdminUpdateOrgUser(orgID, email, attribute, value) {
    const url = this.server + '/api/v2.1/admin/organizations/' + orgID + '/users/' + encodeURIComponent(email) + '/';
    let formData = new FormData();
    switch (attribute) {
      case 'active':
        formData.append('active', value);
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

  sysAdminListLoginLogs(page, perPage) {
    const url = this.server + '/api/v2.1/admin/logs/login-logs/';
    let params = {
      page: page,
      per_page: perPage
    };
    return this.req.get(url, {params: params});
  }

  sysAdminListFileAccessLogs(page, perPage) {
    const url = this.server + '/api/v2.1/admin/logs/file-access-logs/';
    let params = {
      page: page,
      per_page: perPage
    };
    return this.req.get(url, {params: params});
  }

  sysAdminListFileUpdateLogs(page, perPage) {
    const url = this.server + '/api/v2.1/admin/logs/file-update-logs/';
    let params = {
      page: page,
      per_page: perPage
    };
    return this.req.get(url, {params: params});
  }

  sysAdminListSharePermissionLogs(page, perPage) {
    const url = this.server + '/api/v2.1/admin/logs/share-permission-logs/';
    let params = {
      page: page,
      per_page: perPage
    };
    return this.req.get(url, {params: params});
  }

  sysAdminListAdminLogs(page, perPage) {
    const url = this.server + '/api/v2.1/admin/admin-logs/';
    let params = {
      page: page,
      per_page: perPage
    };
    return this.req.get(url, {params: params});
  }

  sysAdminListAdminLoginLogs(page, perPage) {
    const url = this.server + '/api/v2.1/admin/admin-login-logs/';
    let params = {
      page: page,
      per_page: perPage
    };
    return this.req.get(url, {params: params});
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

  sysAdminListUsers(page, perPage, isLDAPImport) {
    let url = this.server + '/api/v2.1/admin/users/';
    let params = {
      page: page,
      per_page: perPage
    };
    if (isLDAPImport) {
      url += '?source=ldapimport';
    }
    return this.req.get(url, {params: params});
  }

  sysAdminSearchUsers(query) {
    let url = this.server + '/api/v2.1/admin/search-user/';
    let params = {
      query: query
    };
    return this.req.get(url, {params: params});
  }

  sysAdminListLDAPUsers(page, perPage) {
    const url = this.server + '/api/v2.1/admin/ldap-users/';
    let params = {
      page: page,
      per_page: perPage
    };
    return this.req.get(url, {params: params});
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

  sysAdminUpdateUser(email, attribute, value) {
    const url = this.server + '/api/v2.1/admin/users/' + encodeURIComponent(email) + '/';
    let formData = new FormData();
    switch (attribute) {
      case 'password':
        formData.append('password', value);
        break;
      case 'is_active':
        formData.append('is_active', value);
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
    }
    return this.req.put(url, formData);
  }

  sysAdminDeleteUser(email) {
    const url = this.server + '/api/v2.1/admin/users/' + encodeURIComponent(email) + '/';
    return this.req.delete(url);
  }

  sysAdminGetUser(email, avatarSize) {
    const url = this.server + '/api/v2.1/admin/users/' + encodeURIComponent(email) + '/';
    let params = {};
    if (avatarSize) {
      params.avatar_size = avatarSize;
    }
    return this.req.get(url, {params: params});
  }

  sysAdminResetUserPassword(email) {
    const url = this.server + '/api/v2.1/admin/users/' + encodeURIComponent(email) + '/reset-password/';
    return this.req.put(url);
  }

  sysAdminSetUserQuotaInBatch(emails, quotaTotal) {
    const url = this.server + '/api/v2.1/admin/users/batch/';
    let formData = new FormData();
    emails.map(email => {
      formData.append('email', email);
    });
    formData.append('operation', 'set-quota');
    formData.append('quota_total', quotaTotal);
    return this._sendPostRequest(url, formData);
  }

  sysAdminDeleteUserInBatch(emails) {
    const url = this.server + '/api/v2.1/admin/users/batch/';
    let formData = new FormData();
    emails.map(email => {
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
    emails.map(email => {
      formData.append('email', email);
    });
    return this._sendPostRequest(url, formData);
  }

  sysAdminListReposByOwner(email) {
    const url = this.server + '/api/v2.1/admin/libraries/';
    let params = {
      owner: email
    };
    return this.req.get(url, {params: params});
  }

  sysAdminListInvitations(page, perPage) {
    const url = this.server + '/api/v2.1/admin/invitations/';
    let params = {
      page: page,
      per_page: perPage
    };
    return this.req.get(url, {params: params});
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
    return this.req.get(url, {params: params});
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
    return this.req.get(url, {params: params});
  }

  sysAdminListInstitutionAdmins(institutionID) {
    const url = this.server + '/api/v2.1/admin/institutions/' + institutionID + '/users/';
    let params = {
      is_institution_admin: true,
    };
    return this.req.get(url, {params: params});
  }

  sysAdminAddInstitutionUserBatch(institutionID, emailArray) {
    const url = this.server + '/api/v2.1/admin/institutions/' + institutionID + '/users/';
    let formData = new FormData();
    emailArray.map(email => {
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

  listVirusScanRecords(pageNum) {
    const url = this.server + '/api/v2.1/admin/virus-scan-records/?page=' + pageNum;
    return this.req.get(url);
  }

  deleteVirusScanRecord(virusID) {
    const url = this.server + '/api/v2.1/admin/virus-scan-records/' + virusID + '/';
    return this.req.delete(url);
  }

  sysAdminStatisticFiles(startTime, endTime, groupBy) {
    const url = this.server + '/api/v2.1/admin/statistics/file-operations/';
    let params = {
      start: startTime,
      end: endTime,
      group_by: groupBy
    }
    return this.req.get(url, {params: params});
  }

  sysAdminStatisticStorages(startTime, endTime, groupBy) {
    const url = this.server + '/api/v2.1/admin/statistics/total-storage/';
    let params = {
      start: startTime,
      end: endTime,
      group_by: groupBy
    }
    return this.req.get(url, {params: params});
  }

  sysAdminStatisticActiveUsers(startTime, endTime, groupBy) {
    const url = this.server + '/api/v2.1/admin/statistics/active-users/';
    let params = {
      start: startTime,
      end: endTime,
      group_by: groupBy
    }
    return this.req.get(url, {params: params});
  }

  sysAdminStatisticTraffic(startTime, endTime, groupBy) {
    const url = this.server + '/api/v2.1/admin/statistics/system-traffic/';
    let params = {
      start: startTime,
      end: endTime,
      group_by: groupBy
    }
    return this.req.get(url, {params: params});
  }

  sysAdminListUserTraffic(month, page, per_page) {
    const url = this.server + '/api/v2.1/admin/statistics/system-user-traffic/';
    let params = {
      month: month,
      page: page,
      per_page: per_page
    }
    return this.req.get(url, {params: params});
  }

  sysAdminListOrgTraffic(month, page, per_page) {
    const url = this.server + '/api/v2.1/admin/statistics/system-org-traffic/';
    let params = {
      month: month,
      page: page,
      per_page: per_page
    }
    return this.req.get(url, {params: params});
  }

}

export { SeafileAPI };
