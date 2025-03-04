import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';

const { repoID, repoName, filePath, fileName } = window.app.pageOptions;
const { serviceUrl } = window.app.config;
const userInfo = window.app.userInfo;
const userName = userInfo.username;
let dirPath = Utils.getDirName(filePath);

// 获取当前图片名称+时间戳
// 理论上会把上传的文件，改成内部的唯一命名——严格意义实际上同时上传，可能存在极少数冲突的情况
function getImageFileNameWithTimestamp() {
  var d = Date.now();
  return 'image-' + d.toString() + '.png';
}

// 这是一个JavaScript类定义`EditorApi`，它似乎是一个用于与文件存储库系统交互的API包装器。对 seafile-api 的进一步封装。

// 下面是每个类方法的简要说明：
// * `constructor()`: 初始化`EditorApi`对象，包括存储库ID、文件路径、服务URL、用户信息和文件名。
// * `saveContent(content)`: 将给定的内容保存到文件存储库中。
// * `unstarItem()`: 从当前文件中删除星标。
// * `starItem()`: 为当前文件添加星标。
// * `getParentDictionaryUrl()`: 返回当前文件的父目录的URL。
// * `_getImageURL(fileName)`: 返回图像文件的URL。
// * `uploadLocalImage(imageFile)`: 上传本地图像文件到存储库并返回其URL。
// * `getFileURL(fileNode)`: 返回文件或目录的URL。
// * `isInternalFileLink(url)`: 检查给定的URL是否是内部文件链接。
// * `isInternalDirLink(url)`: 检查给定的URL是否是内部目录链接。
// * `getFiles()`: 检索存储库中的文件列表。
// * `getFileHistory()`: 检索当前文件的历史记录。
// * `getFileInfo()`: 检索当前文件的信息。
// * `getRepoInfo(newRepoID)`: 检索存储库的信息。
// * `getInternalLink()`: 检索当前文件的内部链接。
// * `createShareLink(repoID, filePath, userPassword, userValidDays, permissions)`: 为文件创建共享链接。
// * `deleteShareLink(token)`: 删除共享链接。
// * `getFileContent(url)`: 检索文件的内容。
// * `listFileHistoryRecords(page, perPage)`: 检索文件历史记录列表。
// * `getFileHistoryVersion(commitID, filePath)`: 检索文件的特定版本。
// * `getUserAvatar(size)`: 检索用户的头像。
// * `fileMetaData()`: 检索当前文件的元数据。
// * `listFileTags()`: 检索当前文件的标签列表。
// * `listRepoTags()`: 检索存储库的标签列表。
// * `markdownLint(slateValue)`: 对给定的值执行Markdown语法检查。
// * `listFileParticipant()`: 检索当前文件的参与者列表。
// * `addFileParticipants(emails)`: 为当前文件添加参与者。
// * `listRepoRelatedUsers()`: 检索与存储库相关的用户列表。

// 注意：许多方法似乎都是对外部API（`seafileAPI`）的调用包装器，但在此代码片段中未定义。
class EditorApi {

  constructor() {
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

  unstarItem() {
    return (
      seafileAPI.unstarItem(this.repoID, this.filePath)
    );
  }

  starItem() {
    return (
      seafileAPI.starItem(this.repoID, this.filePath)
    );
  }

  getParentDictionaryUrl() {
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
        // 获取图片名称+时间戳
        const name = getImageFileNameWithTimestamp();
        const newFile = new File([imageFile], name, { type: imageFile.type });
        const formData = new FormData();
        formData.append('parent_dir', '/');
        formData.append('relative_path', 'images/auto-upload');
        formData.append('file', newFile);
        return seafileAPI.uploadImage(uploadLink, formData);
      }).then ((res) => {
        return this._getImageURL(res.data[0].name);
      })
    );
  };

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
    // eslint-disable-next-line
    var re = new RegExp(serviceUrl + '/library/' + '[0-9a-f-]{36}.*');
    return re.test(url);
  }

  getFiles() {
    const rootPath = '/';
    return seafileAPI.listDir(repoID, rootPath, { recursive: true }).then((response) => {
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

  createShareLink(repoID, filePath, userPassword, userValidDays, permissions) {
    return seafileAPI.createShareLink(repoID, filePath, userPassword, userValidDays, permissions);
  }

  deleteShareLink(token) {
    return seafileAPI.deleteShareLink(token);
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

  getUserAvatar(size) {
    return seafileAPI.getUserAvatar(userName, size);
  }

  fileMetaData() {
    return seafileAPI.fileMetaData(repoID, filePath);
  }

  listFileTags = () => {
    return seafileAPI.listFileTags(repoID, filePath);
  };

  listRepoTags = () => {
    return seafileAPI.listRepoTags(repoID);
  };

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
