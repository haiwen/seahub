import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';

const { repoID, repoName, filePath, fileName, draftID } = window.app.pageOptions;
const { serviceUrl } = window.app.config;
const userInfo = window.app.userInfo;
const userName = userInfo.username;
let dirPath = Utils.getDirName(filePath);

function getImageFileNameWithTimestamp() {
  var d = Date.now();
  return 'image-' + d.toString() + '.png';
}

class EditorApi {

  constructor () {
    this.repoID = repoID;
    this.filePath = filePath;
    this.serviceUrl = serviceUrl;
    this.name = userInfo.name;
    this.contact_email = userInfo.contact_email;
    this.fileName = fileName;
    this.userName = userName;
  }

  saveContent(content) {
    return (
      seafileAPI.getUpdateLink(repoID, dirPath).then((res) => {
        const uploadLink = res.data;
        return seafileAPI.updateFile(uploadLink, filePath, fileName, content);
      })
    );
  }

  unstarItem () {
    return (
      seafileAPI.unstarItem(this.repoID, this.filePath)
    );
  }

  starItem() {
    return (
      seafileAPI.starItem(this.repoID, this.filePath)
    );
  }

  getParentDectionaryUrl() {
    let parentPath = this.filePath.substring(0, this.filePath.lastIndexOf('/'));
    let libName = encodeURIComponent(repoName);
    let path = Utils.encodePath(parentPath);
    return this.serviceUrl + '/library/' + this.repoID + '/' + libName + path;
  }

  _getImageURL(fileName) {
    const url = this.serviceUrl + '/lib/' + repoID + '/file/images/auto-upload/' + fileName + '?raw=1';
    return url;
  }

  uploadLocalImage = (imageFile) => {
    return (
      seafileAPI.getFileServerUploadLink(repoID, '/').then((res) => {
        const uploadLink = res.data + '?ret-json=1';
        const name = getImageFileNameWithTimestamp();
        const newFile = new File([imageFile], name, {type: imageFile.type});
        const formData = new FormData();
        formData.append('parent_dir', '/');
        formData.append('relative_path', 'images/auto-upload');
        formData.append('file', newFile);
        return seafileAPI.uploadImage(uploadLink, formData);
      }).then ((res) => {
        return this._getImageURL(res.data[0].name);
      })
    );
  }

  getFileURL(fileNode) {
    var url;
    if (fileNode.type === 'file') {
      if (fileNode.isImage()) {
        url = serviceUrl + '/lib/' + repoID + '/file' + Utils.encodePath(fileNode.path()) + '?raw=1';
      } else {
        url = serviceUrl + '/lib/' + repoID + '/file' + Utils.encodePath(fileNode.path());
      }
    } else {
      url = serviceUrl + '/library/' + repoID + '/' + encodeURIComponent(repoName) + Utils.encodePath(fileNode.path());
    }
    return url;
  }

  isInternalFileLink(url) {
    var re = new RegExp(this.serviceUrl + '/lib/[0-9a-f-]{36}/file.*');
    return re.test(url);
  }

  isInternalDirLink(url) {
    var re = new RegExp(serviceUrl + '/library/' + '[0-9a-f\-]{36}.*');
    return re.test(url);
  }

  getFiles() {
    const rootPath = '/';
    return seafileAPI.listDir(repoID, rootPath, { recursive: true} ).then((response) => {
      var files = response.data.dirent_list.map((item) => {
        return {
          name: item.name,
          type: item.type === 'dir' ? 'dir' : 'file',
          parent_path: item.parent_dir
        };
      });
      return files;
    });
  }

  getFileHistory() {
    return seafileAPI.getFileHistory(repoID, filePath);
  }

  getFileInfo() {
    return seafileAPI.getFileInfo(repoID, filePath);
  }

  getRepoInfo(newRepoID) {
    return seafileAPI.getRepoInfo(newRepoID);
  }

  getInternalLink() {
    return seafileAPI.getInternalLink(repoID, filePath);
  }

  getShareLink() {
    return seafileAPI.getShareLink(repoID, filePath);
  }

  createShareLink (repoID, filePath, userPassword, userValidDays, permissions) {
    return seafileAPI.createShareLink(repoID, filePath, userPassword, userValidDays, permissions);
  }

  deleteShareLink(token){
    return seafileAPI.deleteShareLink(token);
  }

  getDraftKey() {
    return (repoID + filePath);
  }

  getFileContent(url) {
    return seafileAPI.getFileContent(url);
  }

  listFileHistoryRecords(page, perPage) {
    return seafileAPI.listFileHistoryRecords(repoID, filePath, page, perPage);
  }

  getFileHistoryVersion(commitID, filePath) {
    return seafileAPI.getFileRevision(repoID, commitID, filePath);
  }

  getCommentsNumber() {
    return seafileAPI.getCommentsNumber(this.repoID, filePath);
  }

  postComment(comment, detail) {
    return seafileAPI.postComment(this.repoID, this.filePath, comment, detail);
  }

  listComments() {
    return seafileAPI.listComments(this.repoID, this.filePath);
  }

  updateComment(commentID, resolved, detail, newComment) {
    return seafileAPI.updateComment(this.repoID, commentID, resolved, detail, newComment);
  }

  deleteComment(commentID) {
    return seafileAPI.deleteComment(this.repoID, commentID);
  }

  getUserAvatar(size) {
    return seafileAPI.getUserAvatar(userName, size);
  }

  goDraftPage() {
    window.location.href = serviceUrl + '/drafts/' + draftID + '/';
  }

  createDraftFile() {
    return seafileAPI.createDraft(repoID, filePath).then(res => {
      window.location.href = serviceUrl + '/lib/' + res.data.origin_repo_id + '/file' + Utils.encodePath(res.data.draft_file_path) + '?mode=edit';
    });
  }

  publishDraftFile() {
    return seafileAPI.publishDraft(draftID).then(res => {
      window.location.href = serviceUrl + '/lib/' + repoID + '/file' + Utils.encodePath(res.data.published_file_path);
    });
  }

  fileMetaData() {
    return seafileAPI.fileMetaData(repoID, filePath);
  }

  listFileTags = () => {
    return seafileAPI.listFileTags(repoID, filePath);
  }

  listRepoTags = () => {
    return seafileAPI.listRepoTags(repoID);
  }

  markdownLint(slateValue) {
    return seafileAPI.markdownLint(slateValue);
  }

  listFileParticipant() {
    return seafileAPI.listFileParticipants(repoID, filePath);
  }

  addFileParticipants(emails) {
    return seafileAPI.addFileParticipants(repoID, filePath, emails);
  }

  listRepoRelatedUsers() {
    return seafileAPI.listRepoRelatedUsers(repoID);
  }
}

const editorApi = new EditorApi();

export default editorApi;
