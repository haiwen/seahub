import dayjs from 'dayjs';
import { seafileAPI } from '../../../../utils/seafile-api';
import { Utils } from '../../../../utils/utils';

const getImageFileNameWithTimestamp = () => {
  var d = Date.now();
  return 'image-' + d.toString() + '.png';
};

class LongtextAPI {

  constructor({ repoID, repoName, server }) {
    const { name, username, contactEmail } = window.app.pageOptions;
    this.repoID = repoID;
    this.repoName = repoName;
    this.server = server;
    this.name = name;
    this.contact_email = contactEmail;
    this.userName = username;
    this.relativePath = 'metadata';
  }

  _getImageURL(parentPath, fileName) {
    return `${this.server}/lib/${this.repoID}/file/${parentPath}/${fileName}?raw=1`;
  }

  uploadLocalImage = (imageFile) => {
    const month = dayjs().format('YYYY-MM');
    const parentPath = `images/${this.relativePath}/${month}`;
    return (
      seafileAPI.getFileServerUploadLink(this.repoID, '/').then((res) => {
        const uploadLink = res.data + '?ret-json=1';
        const name = getImageFileNameWithTimestamp();
        const newFile = new File([imageFile], name, { type: imageFile.type });
        const formData = new FormData();
        formData.append('parent_dir', '/');
        formData.append('relative_path', parentPath);
        formData.append('file', newFile);
        return seafileAPI.uploadImage(uploadLink, formData);
      }).then ((res) => {
        return this._getImageURL(parentPath, res.data[0].name);
      })
    );
  };

  getFileURL(fileNode) {
    if (fileNode.type !== 'file') {
      return this.server + '/library/' + this.repoID + '/' + encodeURIComponent(this.repoName) + Utils.encodePath(fileNode.path());
    }
    if (fileNode.isImage()) {
      return this.server + '/lib/' + this.repoID + '/file' + Utils.encodePath(fileNode.path()) + '?raw=1';
    }
    return this.server + '/lib/' + this.repoID + '/file' + Utils.encodePath(fileNode.path());
  }

  isInternalFileLink(url) {
    var re = new RegExp(this.serviceUrl + '/lib/[0-9a-f-]{36}/file.*');
    return re.test(url);
  }

  isInternalDirLink(url) {
    // eslint-disable-next-line
    var re = new RegExp(this.serviceUrl + '/library/' + '[0-9a-f-]{36}.*');
    return re.test(url);
  }

  markdownLint(slateValue) {
    return seafileAPI.markdownLint(slateValue);
  }

}

export default LongtextAPI;
