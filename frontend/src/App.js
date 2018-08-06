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
let dirPath = '/';

const serviceUrl = window.app.config.serviceUrl;
const seafileCollabServer = window.app.config.seafileCollabServer;
const userInfo = window.app.userInfo;
// init seafileAPI
let seafileAPI = new SeafileAPI();
let xcsrfHeaders = cookie.load('csrftoken');
seafileAPI.initForSeahubUsage({ siteRoot, xcsrfHeaders });

function getImageFileNameWithTimestamp() {
  var d = Date.now();
  return "image-" + d.toString() + ".png";
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
        return seafileAPI.updateFile(uploadLink, filePath, fileName, content)
      })
    )
  }

  unStarFile () {
    return (
      seafileAPI.unStarFile(repoID, this.filePath)
    )
  }

  starFile() {
    return (
      seafileAPI.starFile(this.repoID, this.filePath)
    )
  }

  getParentDectionaryUrl() {
    let parentPath = this.filePath.substring(0, this.filePath.lastIndexOf('/'));
    return this.serviceUrl + "/#common/lib/" + this.repoID + parentPath;
  }
  
  _getImageURL(fileName) {
    const url = `${protocol}://${domain}${siteRoot}lib/${repoID}/file/images/${fileName}?raw=1`;
    return url;
  }

  uploadImage = (imageFile) => {
    return (
      seafileAPI.getUploadLink(repoID, dirPath).then((res) => {
        let uploadLinkComponent = res.data;
        const uploadLink = uploadLinkComponent + "?ret-json=1";
        const name = getImageFileNameWithTimestamp();
        const blob = imageFile.slice(0, -1, 'image/png');
        const newFile = new File([blob], name, {type: 'image/png'});
        const formData = new FormData();
        formData.append("parent_dir", "/");
        formData.append("relative_path", "images");
        formData.append("file", newFile);
        return {uploadLink, formData}
      }).then(({ uploadLink, formData}) => {
        return seafileAPI.uploadImage(uploadLink, formData)
      }).then ((res) => {
        let resArr = res.data[0];
        let filename = resArr.name;
        return this._getImageURL(filename);
      })
    )
  }

  getFileURL(fileNode) {
    var url;
    if (fileNode.isImage()) {
      url = protocol + '://' + domain + siteRoot + "lib/" + repoID + "/file" + encodeURIComponent(fileNode.path()) + "?raw=1";
    } else {
      url = protocol + '://' + domain + siteRoot + "lib/" + repoID + "/file" + encodeURIComponent(fileNode.path());
    }
    return url;
  }
  
  isInternalFileLink(url) {
    var re = new RegExp(this.serviceUrl + "/lib/[0-9a-f-]{36}/file.*");
    return re.test(url);
  }

  getFiles() {
    return seafileAPI.listDir(repoID, dirPath, { recursive: true} ).then((response) => {
      var files = response.data.map((item) => {
        return {
          name: item.name,
          type: item.type === 'dir' ? 'dir' : 'file',
          parent_path: item.parent_dir
        }
      })
      return files;
    })
  }

  getFileHistory() {
    return (
      seafileAPI.getFileHistory(repoID, filePath)
    )
  }

  getFileInfo() {
    return (
      seafileAPI.getFileInfo(repoID, filePath)
    )
  }
}



const editorUtilities = new EditorUtilities();

class App extends React.Component {
  constructor(props) {
      super(props);
      this.state = {
        markdownContent: "",
        loading: true,
        mode: "editor",
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
      let lastModifier = last_modifier_name

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
          })
        })
      });
    })
  }

  render() {
    if (this.state.loading) {
      return (
        <div className="empty-loading-page">
          <div className="lds-ripple page-centered"><div></div><div></div></div>
        </div>
      )
    } else if (this.state.mode === "editor") {
      return (
        <SeafileEditor
          fileInfo={this.state.fileInfo}
          markdownContent={this.state.markdownContent}
          editorUtilities={editorUtilities}
          userInfo={this.state.collabServer ? userInfo : null}
          collabServer={this.state.collabServer}
          mode={mode}
        />
      );
    }   
  }
}
export default App;
