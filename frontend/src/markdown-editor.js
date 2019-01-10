import React from 'react';
import SeafileEditor from '@seafile/seafile-editor';
import 'whatwg-fetch';
import { SeafileAPI } from 'seafile-js';
import { Utils } from './utils/utils';
import cookie from 'react-cookies';
let repoID = window.app.pageOptions.repoID;
let repoName = window.app.pageOptions.repoName;
let filePath = window.app.pageOptions.filePath;
let fileName = window.app.pageOptions.fileName;
let siteRoot = window.app.config.siteRoot;
let domain = window.app.pageOptions.domain;
let protocol = window.app.pageOptions.protocol;
let mode = window.app.pageOptions.mode;
let draftID = window.app.pageOptions.draftID;
let reviewID = window.app.pageOptions.reviewID;
let reviewStatus = window.app.pageOptions.reviewStatus;
let isDraft = window.app.pageOptions.isDraft;
let hasDraft = window.app.pageOptions.hasDraft;
let draftFilePath = window.app.pageOptions.draftFilePath;
let shareLinkExpireDaysMin = window.app.pageOptions.shareLinkExpireDaysMin;
let shareLinkExpireDaysMax = window.app.pageOptions.shareLinkExpireDaysMax;
let userName = window.app.userInfo.username;
let dirPath = '/';

const serviceUrl = window.app.config.serviceUrl;
const seafileCollabServer = window.app.config.seafileCollabServer;
const userInfo = window.app.userInfo;
// init seafileAPI
let seafileAPI = new SeafileAPI();
let xcsrfHeaders = cookie.load('sfcsrftoken');
seafileAPI.initForSeahubUsage({ siteRoot, xcsrfHeaders });

function getImageFileNameWithTimestamp() {
  var d = Date.now();
  return 'image-' + d.toString() + '.png';
}


class EditorUtilities {

  constructor () {
    this.repoID = repoID;
    this.filePath = filePath;
    this.serviceUrl = serviceUrl;
    this.name = userName;
    this.contact_email = userInfo.contact_email;
  }
  
  saveContent(content) {
    return (
      seafileAPI.getUpdateLink(repoID, dirPath).then((res) => {
        const uploadLink = res.data;
        return seafileAPI.updateFile(uploadLink, filePath, fileName, content);
      })
    );
  }

  unStarFile () {
    return (
      seafileAPI.unStarFile(repoID, this.filePath)
    );
  }

  starFile() {
    return (
      seafileAPI.starFile(this.repoID, this.filePath)
    );
  }

  getParentDectionaryUrl() {
    let parentPath = this.filePath.substring(0, this.filePath.lastIndexOf('/'));
    let libName = encodeURIComponent(repoName);
    let path = Utils.encodePath(parentPath);
    return this.serviceUrl + '/library/' + this.repoID + '/' + libName + path + '/';
  }
  
  _getImageURL(fileName) {
    const url = this.serviceUrl + '/lib/' + repoID + '/file/images/auto-upload/' + fileName + '?raw=1';
    return url;
  }

  uploadImage = (imageFile) => {
    return (
      seafileAPI.getUploadLink(repoID, dirPath).then((res) => {
        let uploadLinkComponent = res.data;
        const uploadLink = uploadLinkComponent + '?ret-json=1';
        const name = getImageFileNameWithTimestamp();
        const blob = imageFile.slice(0, -1, 'image/png');
        const newFile = new File([blob], name, {type: 'image/png'});
        const formData = new FormData();
        formData.append('parent_dir', '/');
        formData.append('relative_path', 'images/auto-upload');
        formData.append('file', newFile);
        return {uploadLink, formData};
      }).then(({ uploadLink, formData}) => {
        return seafileAPI.uploadImage(uploadLink, formData);
      }).then ((res) => {
        let resArr = res.data[0];
        let filename = resArr.name;
        return this._getImageURL(filename);
      })
    );
  }

  uploadLocalImage = (imageFile) => {
    return (
      seafileAPI.getUploadLink(repoID, dirPath).then((res) => {
        const uploadLink = res.data + '?ret-json=1';
        const newFile = new File([imageFile], imageFile.name, {type: imageFile.type});
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
    return seafileAPI.listDir(repoID, dirPath, { recursive: true} ).then((response) => {
      var files = response.data.map((item) => {
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
    return (
      seafileAPI.getFileHistory(repoID, filePath)
    );
  }

  getFileInfo() {
    return (
      seafileAPI.getFileInfo(repoID, filePath)
    );
  }

  getRepoInfo(newRepoID) {
    return (
      seafileAPI.getRepoInfo(newRepoID)
    );
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
    return (
      seafileAPI.listFileHistoryRecords(repoID, filePath, page, perPage)
    );
  }

  getFileHistoryVersion(commitID) {
    return seafileAPI.getFileRevision(repoID, commitID, filePath);
  }

  createDraftReview() {
    return seafileAPI.createDraftReview(draftID).then(res => {
      let url = serviceUrl + '/drafts/review/' + res.data.id;
      return url;
    });
  }

  goReviewPage() {
    window.location.href = serviceUrl + '/drafts/review/' + reviewID;
  }

  getCommentsNumber() {
    return seafileAPI.getCommentsNumber(this.repoID, dirPath);
  }

  postComment(comment, detail) {
    return seafileAPI.postComment(this.repoID, this.filePath, comment, detail);
  }

  listComments() {
    return seafileAPI.listComments(this.repoID, this.filePath);
  }

  updateComment(commentID, resolved, detail) {
    return seafileAPI.updateComment(this.repoID, commentID, resolved, detail);
  }

  deleteComment(commentID) {
    return seafileAPI.deleteComment(this.repoID, commentID);
  }
 
  getUserAvatar(size) {
    return seafileAPI.getUserAvatar(userName, size);
  }

  goDraftPage() {
    window.location.href = serviceUrl + '/lib/' + repoID + '/file' + draftFilePath + '?mode=edit';
  }

  createDraftFile() {
    return seafileAPI.createDraft(repoID, filePath).then(res => {
      window.location.href = serviceUrl + '/lib/' + res.data.origin_repo_id + '/file' + res.data.draft_file_path + '?mode=edit';
    });
  }

  createFileReview() {
    return seafileAPI.createFileReview(repoID, filePath).then(res => {
      window.location.href = serviceUrl + '/drafts/review/' + res.data.id;
    });
  }

  fileMetaData() {
    return seafileAPI.fileMetaData(repoID, filePath);
  }
}

const editorUtilities = new EditorUtilities();

class MarkdownEditor extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      markdownContent: '',
      loading: true,
      mode: 'editor',
      fileInfo: {
        repoID: repoID,
        name: fileName,
        path: filePath,
        mtime: null,
        size: 0,
        starred: false,
        permission: '',
        lastModifier: '',
        id: '',
      },
      collabServer: seafileCollabServer ? seafileCollabServer : null,
      relatedFiles: [],
    };
  }

  componentDidMount() {

    seafileAPI.getFileInfo(repoID, filePath).then((res) => {
      let { mtime, size, starred, permission, last_modifier_name, id } = res.data;
      let lastModifier = last_modifier_name;

      this.setState((prevState, props) => ({
        fileInfo: {
          ...prevState.fileInfo,
          mtime,
          size,
          starred,
          permission,
          lastModifier,
          id
        }
      }));

      seafileAPI.getFileDownloadLink(repoID, filePath).then((res) => {
        const downLoadUrl = res.data;
        seafileAPI.getFileContent(downLoadUrl).then((res) => {
          this.setState({
            markdownContent: res.data,
            loading: false
          });
        });
      });
    });

    seafileAPI.listRelatedFiles(repoID, filePath).then(res => {
      this.setState({
        relatedFiles: res.data.related_files
      })
    });
  }

  render() {
    if (this.state.loading) {
      return (
        <div className="empty-loading-page">
          <div className="lds-ripple page-centered"><div></div><div></div></div>
        </div>
      );
    } else if (this.state.mode === 'editor') {
      return (
        <SeafileEditor
          fileInfo={this.state.fileInfo}
          markdownContent={this.state.markdownContent}
          editorUtilities={editorUtilities}
          userInfo={this.state.collabServer ? userInfo : null}
          collabServer={this.state.collabServer}
          showFileHistory={true}
          mode={mode}
          draftID={draftID}
          reviewID={reviewID}
          reviewStatus={reviewStatus}
          isDraft={isDraft}
          hasDraft={hasDraft}
          shareLinkExpireDaysMin={shareLinkExpireDaysMin}
          shareLinkExpireDaysMax={shareLinkExpireDaysMax}
          relatedFiles={this.state.relatedFiles}
          siteRoot={siteRoot}
        />
      );
    }   
  }
}

export default MarkdownEditor;
