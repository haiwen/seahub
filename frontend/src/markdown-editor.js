import React from 'react';
import SeafileEditor from '@seafile/seafile-editor';
import 'whatwg-fetch';
import { SeafileAPI } from 'seafile-js';
import cookie from 'react-cookies';
let repoID = window.app.pageOptions.repoID;
let filePath = window.app.pageOptions.filePath;
let fileName = window.app.pageOptions.fileName;
let siteRoot = window.app.config.siteRoot;
let domain = window.app.pageOptions.domain;
let protocol = window.app.pageOptions.protocol;
let mode = window.app.pageOptions.mode;
let draftID = window.app.pageOptions.draftID;
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
    return this.serviceUrl + '/#common/lib/' + this.repoID + parentPath;
  }
  
  _getImageURL(fileName) {
    const url = `${protocol}://${domain}${siteRoot}lib/${repoID}/file/images/${fileName}?raw=1`;
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
        formData.append('relative_path', 'images');
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

  getFileURL(fileNode) {
    var url;
    if (fileNode.type === 'file') {
      if (fileNode.isImage()) {
        url = serviceUrl + '/lib/' + repoID + '/file' + encodeURIComponent(fileNode.path()) + '?raw=1';
      } else {
        url = serviceUrl + '/lib/' + repoID + '/file' + encodeURIComponent(fileNode.path());
      }
    } else {
      url = serviceUrl + '/#common/lib/' + repoID + encodeURIComponent(fileNode.path());
    }
    return url;
  }
  
  isInternalFileLink(url) {
    var re = new RegExp(this.serviceUrl + '/lib/[0-9a-f-]{36}/file.*');
    return re.test(url);
  }

  
  isInternalDirLink(url) {
    var re = new RegExp(serviceUrl + '/#[a-z\-]*?/lib/' + '[0-9a-f\-]{36}.*');
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

  getInternalLink() {
    return seafileAPI.getInternalLink(repoID, filePath);
  }

  getShareLink() {
    return seafileAPI.getShareLink(repoID, filePath);
  }

  createShareLink (repoID, filePath, userPassword, userValidDays) {
    return seafileAPI.createShareLink(repoID, filePath, userPassword, userValidDays);
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
    return seafileAPI.createDraftReview(draftID)
      .then(res => {
        let url = serviceUrl + '/drafts/review/' + res.data.id;
        return url;
      })
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
      },
      collabServer: seafileCollabServer ? seafileCollabServer : null,
    };
  }

  componentDidMount() {

    seafileAPI.getFileInfo(repoID, filePath).then((res) => {
      let { mtime, size, starred, permission, last_modifier_name } = res.data;
      let lastModifier = last_modifier_name;

      this.setState((prevState, props) => ({
        fileInfo: {
          ...prevState.fileInfo,
          mtime,
          size,
          starred,
          permission,
          lastModifier
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
        />
      );
    }   
  }
}

export default MarkdownEditor;
