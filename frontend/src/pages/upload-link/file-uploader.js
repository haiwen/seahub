// This file is copied from frontend/src/components/file-uploader/file-uploader.js,
// and modified according to the requirements of this page.
import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import Resumablejs from '@seafile/resumablejs';
import MD5 from 'MD5';
import { resumableUploadFileBlockSize, maxUploadFileSize, maxNumberOfFilesForFileupload } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import { gettext } from '../../utils/constants';
import UploadProgressDialog from './upload-progress-dialog';
import toaster from '../../components/toast';

import '../../css/file-uploader.css';

const propTypes = {
  dragAndDrop: PropTypes.bool.isRequired,
  token: PropTypes.string.isRequired,
  repoID: PropTypes.string.isRequired,
  path: PropTypes.string.isRequired,

  filetypes: PropTypes.array,
  chunkSize: PropTypes.number,
  withCredentials: PropTypes.bool,
  testMethod: PropTypes.string,
  testChunks: PropTypes.number,
  simultaneousUploads: PropTypes.number,
  fileParameterName: PropTypes.string,
  minFileSizeErrorCallback: PropTypes.func,
  fileTypeErrorCallback: PropTypes.func,
  onFileUploadSuccess: PropTypes.func.isRequired,
};

class FileUploader extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      retryFileList: [],
      uploadFileList: [],
      forbidUploadFileList: [],
      totalProgress: 0,
      isUploadProgressDialogShow: false,
      currentResumableFile: null,
      uploadBitrate: 0,
      allFilesUploaded: false,
    };

    this.uploadInput = React.createRef();

    this.notifiedFolders = [];

    this.timestamp = null;
    this.loaded = 0;
    this.bitrateInterval = 500; // Interval in milliseconds to calculate the bitrate
    this.isUploadLinkLoaded = false;

    window.onbeforeunload = this.onbeforeunload;
  }

  componentDidMount() {
    this.resumable = new Resumablejs({
      target: '',
      query: this.setQuery || {},
      fileType: this.props.filetypes,
      maxFiles: maxNumberOfFilesForFileupload || undefined,
      maxFileSize: maxUploadFileSize * 1000 * 1000 || undefined,
      testMethod: this.props.testMethod || 'post',
      testChunks: this.props.testChunks || false,
      headers: this.setHeaders || {},
      withCredentials: this.props.withCredentials || false,
      chunkSize: parseInt(resumableUploadFileBlockSize) * 1024 * 1024 || 1 * 1024 * 1024,
      simultaneousUploads: this.props.simultaneousUploads || 1,
      fileParameterName: this.props.fileParameterName,
      generateUniqueIdentifier: this.generateUniqueIdentifier,
      forceChunkSize: true,
      maxChunkRetries: 3,
      minFileSize: 0,
    });

    this.resumable.assignBrowse(this.uploadInput.current, true);
    if (this.props.dragAndDrop) {
      this.resumable.assignDrop(document.getElementById('upload-link-drop-zone'));
    }

    this.bindCallbackHandler();
    this.bindEventHandler();
  }

  componentWillUnmount = () => {
    window.onbeforeunload = null;
    if (this.props.dragAndDrop === true) {
      this.resumable.disableDropOnDocument();
    }
  }

  onbeforeunload = () => {
    if (window.uploader &&
        window.uploader.isUploadProgressDialogShow &&
        window.uploader.totalProgress !== 100) {
      return '';
    }
  }

  bindCallbackHandler = () => {
    let { minFileSizeErrorCallback, fileTypeErrorCallback } = this.props;

    if (this.maxFilesErrorCallback) {
      this.resumable.opts.maxFilesErrorCallback = this.maxFilesErrorCallback;
    }

    if (minFileSizeErrorCallback) {
      this.resumable.opts.minFileSizeErrorCallback = this.props.minFileSizeErrorCallback;
    }

    if (this.maxFileSizeErrorCallback) {
      this.resumable.opts.maxFileSizeErrorCallback = this.maxFileSizeErrorCallback;
    }

    if (fileTypeErrorCallback) {
      this.resumable.opts.fileTypeErrorCallback = this.props.fileTypeErrorCallback;
    }

  }

  bindEventHandler = () => {
    this.resumable.on('chunkingComplete', this.onChunkingComplete.bind(this));
    this.resumable.on('fileAdded', this.onFileAdded.bind(this));
    this.resumable.on('fileProgress', this.onFileProgress.bind(this));
    this.resumable.on('fileSuccess', this.onFileUploadSuccess.bind(this));
    this.resumable.on('fileError', this.onFileError.bind(this));
    this.resumable.on('uploadStart', this.onUploadStart.bind(this));
    this.resumable.on('progress', this.onProgress.bind(this));
    this.resumable.on('complete', this.onComplete.bind(this));
    this.resumable.on('error', this.onError.bind(this));
    this.resumable.on('dragstart', this.onDragStart.bind(this));
  }

  maxFilesErrorCallback = (files, errorCount) => {
    let maxFiles = maxNumberOfFilesForFileupload;
    let message = gettext('Please upload no more than {maxFiles} files at a time.');
    message = message.replace('{maxFiles}', maxFiles);
    toaster.danger(message);
  }

  maxFileSizeErrorCallback = (file) => {
    let { forbidUploadFileList } = this.state;
    forbidUploadFileList.push(file);
    this.setState({forbidUploadFileList: forbidUploadFileList});
  }

  onChunkingComplete = (resumableFile) => {

    let allFilesUploaded = this.state.allFilesUploaded;
    if (allFilesUploaded === true) {
      this.setState({allFilesUploaded: false});
    }

    let path = this.props.path;
    let fileName = resumableFile.fileName;
    let relativePath = resumableFile.relativePath;
    let isFile = fileName === relativePath;

    resumableFile.formData = {};
    if (isFile) { // upload file
      resumableFile.formData  = {
        parent_dir: path,
      };
    } else { // upload folder
      let relative_path = relativePath.slice(0, relativePath.lastIndexOf('/') + 1);
      resumableFile.formData  = {
        parent_dir: path,
        relative_path: relative_path
      };
    }
  }

  onFileAdded = (resumableFile, files) => {
    let isFile = resumableFile.fileName === resumableFile.relativePath;
    if (isFile && files.length === 1) {
      let hasRepetition = false;
      /*
      let direntList = this.props.direntList;
      for (let i = 0; i < direntList.length; i++) {
        if (direntList[i].type === 'file' && direntList[i].name === resumableFile.fileName) {
          hasRepetition = true;
          break;
        }
      }
      */
      if (hasRepetition) {
        this.setState({
          isUploadRemindDialogShow: true,
          currentResumableFile: resumableFile,
        });
      } else {
        this.setUploadFileList(this.resumable.files);
        seafileAPI.sharedUploadLinkGetFileUploadUrl(this.props.token).then(res => {
          this.resumable.opts.target = res.data.upload_link + '?ret-json=1';
          this.resumableUpload(resumableFile);
        }).catch(error => {
          let errMessage = Utils.getErrorMsg(error);
          toaster.danger(errMessage);
        });
      }
    } else {
      this.setUploadFileList(this.resumable.files);
      if (!this.isUploadLinkLoaded) {
        this.isUploadLinkLoaded = true;
        seafileAPI.sharedUploadLinkGetFileUploadUrl(this.props.token).then(res => {
          this.resumable.opts.target = res.data.upload_link + '?ret-json=1';
          this.resumable.upload();
        }).catch(error => {
          let errMessage = Utils.getErrorMsg(error);
          toaster.danger(errMessage);
        });
      }
    }
  }

  resumableUpload = (resumableFile) => {
    let { repoID, path } = this.props;
    seafileAPI.getFileUploadedBytes(repoID, path, resumableFile.fileName).then(res => {
      let uploadedBytes = res.data.uploadedBytes;
      let blockSize = parseInt(resumableUploadFileBlockSize) * 1024 * 1024 || 1024 * 1024;
      let offset = Math.floor(uploadedBytes / blockSize);
      resumableFile.markChunksCompleted(offset);
      this.resumable.upload();
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  filesAddedComplete = (resumable, files) => {
    let { forbidUploadFileList } = this.state;
    if (forbidUploadFileList.length > 0 && files.length === 0) {
      this.setState({
        isUploadProgressDialogShow: true,
        totalProgress: 100
      });
    }
  }

  setUploadFileList = () => {
    let uploadFileList = this.resumable.files;
    this.setState({
      uploadFileList: uploadFileList,
      isUploadProgressDialogShow: true,
    });
    Utils.registerGlobalVariable('uploader', 'isUploadProgressDialogShow', true);
  }

  onFileProgress = (resumableFile) => {
    let uploadBitrate = this.getBitrate();
    let uploadFileList = this.state.uploadFileList.map(item => {
      if (item.uniqueIdentifier === resumableFile.uniqueIdentifier) {
        if (uploadBitrate) {
          let lastSize = (item.size - (item.size * item.progress())) * 8;
          let time = Math.floor(lastSize / uploadBitrate);
          item.remainingTime = time;
        }
      }
      return item;
    });

    this.setState({
      uploadBitrate: uploadBitrate,
      uploadFileList: uploadFileList
    });
  }

  getBitrate = () => {
    let loaded = 0;
    let uploadBitrate = 0;
    let now = new Date().getTime();

    this.resumable.files.forEach(file => {
      loaded += file.progress() * file.size;
    });

    if (this.timestamp) {
      let timeDiff = (now - this.timestamp);
      if (timeDiff < this.bitrateInterval) {
        return this.state.uploadBitrate;
      }

      // 1. Cancel will produce loaded greater than this.loaded
      // 2. reset can make this.loaded to be 0
      if (loaded < this.loaded || this.loaded === 0) {
        this.loaded = loaded; //
      }

      uploadBitrate = (loaded - this.loaded) * (1000 / timeDiff) * 8;
    }

    this.timestamp = now;
    this.loaded = loaded;

    return uploadBitrate;
  }

  // start uploading
  onUploadStart = () => {
    const message = gettext('File upload started');
    toaster.notify(message);
  }

  onProgress = () => {
    let progress = Math.round(this.resumable.progress() * 100);
    this.setState({totalProgress: progress});
    Utils.registerGlobalVariable('uploader', 'totalProgress', progress);
  }

  onFileUploadSuccess = (resumableFile, message) => {
    let formData = resumableFile.formData;
    let currentTime = new Date().getTime()/1000;
    message = formData.replace ? message : JSON.parse(message)[0];
    if (formData.relative_path) { // upload folder
      let relative_path = formData.relative_path;
      let dir_name = relative_path.slice(0, relative_path.indexOf('/'));
      let dirent = {
        id: message.id,
        name: dir_name,
        type: 'dir',
        mtime: currentTime,
      };

      // update folders cache
      let isExist = this.notifiedFolders.some(item => {return item.name === dirent.name;});
      if (!isExist) {
        this.notifiedFolders.push(dirent);
        this.props.onFileUploadSuccess(dirent);
      }

      // update uploadFileList
      let uploadFileList = this.state.uploadFileList.map(item => {
        if (item.uniqueIdentifier === resumableFile.uniqueIdentifier) {
          item.newFileName = relative_path + message.name;
          item.isSaved = true;
        }
        return item;
      });
      this.setState({uploadFileList: uploadFileList});

      return;
    }

    if (formData.replace) { // upload file -- replace exist file
      let fileName = resumableFile.fileName;
      let dirent = {
        id: message,
        name: fileName,
        type: 'file',
        mtime: currentTime
      };
      this.props.onFileUploadSuccess(dirent); // this contance: just one file

      let uploadFileList = this.state.uploadFileList.map(item => {
        if (item.uniqueIdentifier === resumableFile.uniqueIdentifier) {
          item.newFileName = fileName;
          item.isSaved = true;
        }
        return item;
      });
      this.setState({uploadFileList: uploadFileList});

      return;
    }

    // upload file -- add files
    let dirent = {
      id: message.id,
      type: 'file',
      name: message.name,
      size: message.size,
      mtime: currentTime,
    };
    this.props.onFileUploadSuccess(dirent);

    let uploadFileList = this.state.uploadFileList.map(item => {
      if (item.uniqueIdentifier === resumableFile.uniqueIdentifier) {
        item.newFileName = message.name;
        item.isSaved = true;
      }
      return item;
    });
    this.setState({uploadFileList: uploadFileList});
  }

  onFileError = (resumableFile, message) => {
    let error = '';
    if (!message) {
      error = gettext('Network error');
    } else {
      // eg: '{"error": "Internal error" \n }'
      let errorMessage = message.replace(/\n/g, '');
      errorMessage  = JSON.parse(errorMessage);
      error = errorMessage.error;
      if (error === 'File locked by others.') {
        error = gettext('File is locked by others.');
      }
      if (error === 'Internal error.') {
        error = gettext('Internal Server Error');
      }
    }

    let uploadFileList = this.state.uploadFileList.map(item => {
      if (item.uniqueIdentifier === resumableFile.uniqueIdentifier) {
        this.state.retryFileList.push(item);
        item.error = error;
      }
      return item;
    });

    this.loaded = 0;  // reset loaded data;
    this.setState({
      retryFileList: this.state.retryFileList,
      uploadFileList: uploadFileList
    });
  }

  onComplete = () => {
    if (!this.error) {
      const message = gettext('All files uploaded');
      toaster.success(message);
    }
    this.error = false; // reset it

    this.notifiedFolders = [];
    // reset upload link loaded
    this.isUploadLinkLoaded = false;
    this.setState({allFilesUploaded: true});
  }

  onError = (message, file) => {
    let msg = gettext('Error');
    if (file && file.fileName) {
      msg = gettext('Failed to upload {file_name}.')
        .replace('{file_name}', file.fileName);
    }
    toaster.danger(msg, {'id': 'file-error-msg'});
    this.error = true;

    // reset upload link loaded
    this.isUploadLinkLoaded = false;
    // After the error, the user can switch windows
    Utils.registerGlobalVariable('uploader', 'totalProgress', 100);
  }

  setHeaders = (resumableFile, resumable) => {
    let offset = resumable.offset;
    let chunkSize = resumable.getOpt('chunkSize');
    let fileSize = resumableFile.size === 0 ? 1 : resumableFile.size;
    let startByte = offset !== 0 ? offset * chunkSize : 0;
    let endByte = Math.min(fileSize, (offset + 1) * chunkSize) - 1;

    if (fileSize - resumable.endByte < chunkSize && !resumable.getOpt('forceChunkSize')) {
      endByte = fileSize;
    }

    let headers = {
      'Accept': 'application/json; text/javascript, */*; q=0.01',
      'Content-Disposition': 'attachment; filename="' + encodeURI(resumableFile.fileName) + '"',
      'Content-Range': 'bytes ' + startByte + '-' + endByte + '/' + fileSize,
    };

    return headers;
  }

  setQuery = (resumableFile) => {
    let formData = resumableFile.formData;
    return formData;
  }

  generateUniqueIdentifier = (file) => {
    let relativePath = file.webkitRelativePath||file.relativePath||file.fileName||file.name;
    return MD5(relativePath + new Date()) + relativePath;
  }

  onClick = (e) => {
    e.nativeEvent.stopImmediatePropagation();
    e.stopPropagation();
  }

  onFileUpload = () => {
    this.uploadInput.current.removeAttribute('webkitdirectory');
    this.uploadInput.current.click();
  }

  onFolderUpload = () => {
    this.uploadInput.current.setAttribute('webkitdirectory', 'webkitdirectory');
    this.uploadInput.current.click();
  }

  onDragStart = () => {
    this.uploadInput.current.setAttribute('webkitdirectory', 'webkitdirectory');
  }

  onCloseUploadDialog = () => {
    this.loaded = 0;
    this.resumable.files = [];
    // reset upload link loaded
    this.isUploadLinkLoaded = false;
    this.setState({isUploadProgressDialogShow: false, uploadFileList: [], forbidUploadFileList: []});
    Utils.registerGlobalVariable('uploader', 'isUploadProgressDialogShow', false);
  }

  onUploadCancel = (uploadingItem) => {

    let uploadFileList = this.state.uploadFileList.filter(item => {
      if (item.uniqueIdentifier === uploadingItem.uniqueIdentifier) {
        item.cancel(); // execute cancel function will delete the file at the same time
        return false;
      }
      return true;
    });

    if (!this.resumable.isUploading()) {
      this.setState({
        totalProgress: '100',
        allFilesUploaded: true,
      });
      this.loaded = 0;
    }

    this.setState({uploadFileList: uploadFileList});
  }

  onCancelAllUploading = () => {
    let uploadFileList = this.state.uploadFileList.filter(item => {
      if (Math.round(item.progress() !== 1)) {
        item.cancel();
        return false;
      }
      return true;
    });

    this.loaded = 0;

    this.setState({
      allFilesUploaded: true,
      totalProgress: '100',
      uploadFileList: uploadFileList
    });
    // reset upload link loaded
    this.isUploadLinkLoaded = false;
  }

  onUploadRetry = (resumableFile) => {
    seafileAPI.sharedUploadLinkGetFileUploadUrl(this.props.token).then(res => {
      this.resumable.opts.target = res.data.upload_link + '?ret-json=1';
      let retryFileList = this.state.retryFileList.filter(item => {
        return item.uniqueIdentifier !== resumableFile.uniqueIdentifier;
      });
      let uploadFileList = this.state.uploadFileList.map(item => {
        if (item.uniqueIdentifier === resumableFile.uniqueIdentifier) {
          item.error = null;
          this.retryUploadFile(item);
        }
        return item;
      });

      this.setState({
        retryFileList: retryFileList,
        uploadFileList: uploadFileList
      });
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  retryUploadFile = (resumableFile) => {
    let { repoID, path } = this.props;
    let fileName = resumableFile.fileName;
    let isFile = resumableFile.fileName === resumableFile.relativePath;
    if (!isFile) {
      let relative_path = resumableFile.formData.relative_path;
      let prefix = path === '/' ? (path + relative_path) : (path + '/' + relative_path);
      fileName = prefix + fileName;
    }

    resumableFile.bootstrap();
    var firedRetry = false;
    resumableFile.resumableObj.on('chunkingComplete', () => {
      if(!firedRetry) {
        seafileAPI.getFileUploadedBytes(repoID, path, fileName).then(res => {
          let uploadedBytes = res.data.uploadedBytes;
          let blockSize = parseInt(resumableUploadFileBlockSize) * 1024 * 1024 || 1024 * 1024;
          let offset = Math.floor(uploadedBytes / blockSize);
          resumableFile.markChunksCompleted(offset);

          resumableFile.resumableObj.upload();

        }).catch(error => {
          let errMessage = Utils.getErrorMsg(error);
          toaster.danger(errMessage);
        });
      }
      firedRetry = true;
    });

  }

  replaceRepetitionFile = () => {
    let { repoID, path } = this.props;
    seafileAPI.getUpdateLink(repoID, path).then(res => {
      this.resumable.opts.target = res.data;

      let resumableFile = this.resumable.files[this.resumable.files.length - 1];
      resumableFile.formData['replace'] = 1;
      resumableFile.formData['target_file'] = resumableFile.formData.parent_dir + resumableFile.fileName;
      this.setUploadFileList(this.resumable.files);
      this.resumable.upload();
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  cancelFileUpload = () => {
    this.resumable.files.pop(); //delete latest file；
  }

  render() {
    return (
      <Fragment>
        <div className="file-uploader-container">
          <div className="file-uploader">
            <input className="upload-input" type="file" ref={this.uploadInput} onClick={this.onClick} />
          </div>
        </div>
        <UploadProgressDialog
          retryFileList={this.state.retryFileList}
          uploadFileList={this.state.uploadFileList}
          forbidUploadFileList={this.state.forbidUploadFileList}
          totalProgress={this.state.totalProgress}
          uploadBitrate={this.state.uploadBitrate}
          allFilesUploaded={this.state.allFilesUploaded}
          onCloseUploadDialog={this.onCloseUploadDialog}
          onCancelAllUploading={this.onCancelAllUploading}
          onUploadCancel={this.onUploadCancel}
          onUploadRetry={this.onUploadRetry}
          onFileUpload={this.onFileUpload}
          onFolderUpload={this.onFolderUpload}
        />
      </Fragment>
    );
  }
}

FileUploader.propTypes = propTypes;

export default FileUploader;
