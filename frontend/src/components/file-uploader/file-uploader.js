import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import Resumablejs from '@seafile/resumablejs';
import MD5 from 'MD5';
import { enableResumableFileUpload, resumableUploadFileBlockSize } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import { gettext } from '../../utils/constants';
import UploadProgressDialog from './upload-progress-dialog';
import UploadRemindDialog from '../dialog/upload-remind-dialog';
import toaster from '../toast';
import '../../css/file-uploader.css';

const propTypes = {
  repoID: PropTypes.string.isRequired,
  direntList: PropTypes.array.isRequired,
  filetypes: PropTypes.array,
  chunkSize: PropTypes.number,
  withCredentials: PropTypes.bool,
  maxFiles: PropTypes.number,
  maxFileSize: PropTypes.number,
  testMethod: PropTypes.string,
  testChunks: PropTypes.number,
  simultaneousUploads: PropTypes.number,
  fileParameterName: PropTypes.string,
  maxFilesErrorCallback: PropTypes.func,
  maxFileSizeErrorCallback: PropTypes.func,
  minFileSizeErrorCallback: PropTypes.func,
  fileTypeErrorCallback: PropTypes.func,
  dragAndDrop: PropTypes.bool.isRequired,
  path: PropTypes.string.isRequired,
  onFileUploadSuccess: PropTypes.func.isRequired,
};

class FileUploader extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      retryFileList: [],
      uploadFileList: [],
      totalProgress: 0,
      isUploadProgressDialogShow: false,
      isUploadRemindDialogShow: false,
      currentResumableFile: null,
      uploadBitrate: '0',
      allFilesUploaded: false,
    };

    this.uploadInput = React.createRef();

    this.notifiedFolders = [];

    this.timestamp = null;
    this.loaded = 0;
    this.bitrateInterval = 500; // Interval in milliseconds to calculate the bitrate
    window.onbeforeunload = this.onbeforeunload;
  }

  componentDidMount() {
    this.resumable = new Resumablejs({
      target: '',
      query: this.setQuery || {},
      fileType: this.props.filetypes,
      maxFiles: this.props.maxFiles,
      maxFileSize: this.props.maxFileSize,
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
    });

    this.resumable.assignBrowse(this.uploadInput.current, true);

    //Enable or Disable DragAnd Drop
    if (this.props.dragAndDrop === true) {
      this.resumable.enableDropOnDocument();
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
    let {maxFilesErrorCallback, minFileSizeErrorCallback, maxFileSizeErrorCallback, fileTypeErrorCallback } = this.props;

    if (maxFilesErrorCallback) {
      this.resumable.opts.maxFilesErrorCallback = this.props.maxFilesErrorCallback;
    }

    if (minFileSizeErrorCallback) {
      this.resumable.opts.minFileSizeErrorCallback = this.props.minFileSizeErrorCallback;
    }

    if (maxFileSizeErrorCallback) {
      this.resumable.opts.maxFileSizeErrorCallback = this.props.maxFileSizeErrorCallback;
    }

    if (fileTypeErrorCallback) {
      this.resumable.opts.fileTypeErrorCallback = this.props.fileTypeErrorCallback;
    }

  }

  bindEventHandler = () => {
    this.resumable.on('chunkingComplete', this.onChunkingComplete.bind(this));
    this.resumable.on('fileAdded', this.onFileAdded.bind(this));
    this.resumable.on('filesAddedComplete', this.filesAddedComplete.bind(this));
    this.resumable.on('fileProgress', this.onFileProgress.bind(this));
    this.resumable.on('fileSuccess', this.onFileUploadSuccess.bind(this));
    this.resumable.on('progress', this.onProgress.bind(this));
    this.resumable.on('complete', this.onComplete.bind(this));
    this.resumable.on('pause', this.onPause.bind(this));
    this.resumable.on('fileRetry', this.onFileRetry.bind(this));
    this.resumable.on('fileError', this.onFileError.bind(this));
    this.resumable.on('error', this.onError.bind(this));
    this.resumable.on('beforeCancel', this.onBeforeCancel.bind(this));
    this.resumable.on('cancel', this.onCancel.bind(this));
    this.resumable.on('dragstart', this.onDragStart.bind(this));
  }

  onChunkingComplete = (resumableFile) => {

    let allFilesUploaded = this.state.allFilesUploaded;
    if (allFilesUploaded === true) {
      this.setState({allFilesUploaded: false});
    } 

    //get parent_dir relative_path
    let path = this.props.path === '/' ? '/' : this.props.path + '/';
    let fileName = resumableFile.fileName;
    let relativePath = resumableFile.relativePath;
    let isFile = fileName === relativePath;

    //update formdata
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
    // uploading is file and only upload one file
    if (isFile && files.length === 1) {
      let hasRepetition = false;
      let direntList = this.props.direntList;
      for (let i = 0; i < direntList.length; i++) {
        if (direntList[i].type === 'file' && direntList[i].name === resumableFile.fileName) {
          hasRepetition = true;
          break;
        }
      }
      if (hasRepetition) {
        this.setState({
          isUploadRemindDialogShow: true,
          currentResumableFile: resumableFile,
        });
      } else {
        this.setUploadFileList(this.resumable.files);
        this.resumableUpload(resumableFile);
      }
    } else { 
      this.setUploadFileList(this.resumable.files);
      if (isFile) {
        this.resumableUpload(resumableFile);
      } else {
        this.resumable.upload();
      }
    }
  }

  resumableUpload = (resumableFile) => {
    let { repoID, path } = this.props;
    seafileAPI.getFileUploadedBytes(repoID, path, resumableFile.fileName).then(res => {
      let uploadedBytes = res.data.uploadedBytes;
      let offset = Math.floor(uploadedBytes / (1024 * 1024));
      resumableFile.markChunksCompleted(offset);
      this.resumable.upload();
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  filesAddedComplete = (resumable, files) => {
    // single file uploading can check repetition, because custom dialog conn't prevent program execution;
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
          let time = Math.ceil(lastSize / uploadBitrate);
          time = Utils.formatTime(time);
          item.lastTime = time;
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
          item.lastTime = 0;
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
          item.lastTime = 0;
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
    this.props.onFileUploadSuccess(dirent); // this contance:  no repetition file

    let uploadFileList = this.state.uploadFileList.map(item => {
      if (item.uniqueIdentifier === resumableFile.uniqueIdentifier) {
        item.newFileName = message.name;
        item.isSaved = true;
        item.lastTime = 0;
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
      error = message;
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
    this.notifiedFolders = [];
    this.setState({allFilesUploaded: true});
  }

  onPause = () => {

  }

  onError = (message) => {

  }

  onFileRetry = () => {
    // todo, cancel upload file, uploded again;
  }

  onBeforeCancel = () => {
    // todo, giving a pop message ?
  }

  onCancel = () => {

  }

  setHeaders = (resumableFile, resumable) => {
    let offset = resumable.offset;
    let chunkSize = resumable.getOpt('chunkSize');
    let fileSize = resumableFile.size;
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
    let repoID = this.props.repoID;
    seafileAPI.getUploadLink(repoID, this.props.path).then(res => {
      this.resumable.opts.target = res.data + '?ret-json=1';
      if (Utils.isIEBrower()) {
        this.uploadInput.current.click();
      }
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
    if (!Utils.isIEBrower()) {
      this.uploadInput.current.click();
    }
  }

  onFolderUpload = () => {
    this.uploadInput.current.setAttribute('webkitdirectory', 'webkitdirectory');
    let repoID = this.props.repoID;
    seafileAPI.getUploadLink(repoID, this.props.path).then(res => {
      this.resumable.opts.target = res.data + '?ret-json=1';
      if (Utils.isIEBrower()) {
        this.uploadInput.current.click();
      }
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
    if (!Utils.isIEBrower()) {
      this.uploadInput.current.click();
    }
  }

  onDragStart = () => {
    let repoID = this.props.repoID;
    this.uploadInput.current.setAttribute('webkitdirectory', 'webkitdirectory');
    seafileAPI.getUploadLink(repoID, this.props.path).then(res => {
      this.resumable.opts.target = res.data + '?ret-json=1';
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  onCloseUploadDialog = () => {
    this.loaded = 0;
    this.resumable.files = [];
    this.setState({isUploadProgressDialogShow: false, uploadFileList: []});
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
  }

  onUploadRetry = (resumableFile) => {

    seafileAPI.getUploadLink(this.props.repoID, this.props.path).then(res => {
      this.resumable.opts.target = res.data;
      
      let retryFileList = this.state.retryFileList.filter(item => {
        return item.uniqueIdentifier !== resumableFile.uniqueIdentifier;
      });
      let uploadFileList = this.state.uploadFileList.map(item => {
        if (item.uniqueIdentifier === resumableFile.uniqueIdentifier) {
          item.error = null;
          item.retry();
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

  onUploadRetryAll = () => {

    seafileAPI.getUploadLink(this.props.repoID, this.props.path).then(res => {
      this.resumable.opts.target = res.data;
      this.state.retryFileList.forEach(item => {
        item.retry();
        item.error = false;
      });
      
      let uploadFileList = this.state.uploadFileList.slice(0);
      this.setState({
        retryFileList: [],
        uploadFileList: uploadFileList
      });

    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  replaceRepetitionFile = () => {
    let { repoID, path } = this.props;
    seafileAPI.getUpdateLink(repoID, path).then(res => {
      this.resumable.opts.target = res.data;

      let resumableFile = this.resumable.files[this.resumable.files.length - 1];
      resumableFile.formData['replace'] = 1;
      resumableFile.formData['target_file'] = resumableFile.formData.parent_dir + resumableFile.fileName;
      this.setState({isUploadRemindDialogShow: false});
      this.setUploadFileList(this.resumable.files);
      this.resumable.upload();
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }
  
  uploadFile = () => {
    let resumableFile = this.resumable.files[this.resumable.files.length - 1];
    this.setState({
      isUploadRemindDialogShow: false,
      isUploadProgressDialogShow: true,
      uploadFileList: [...this.state.uploadFileList, resumableFile]
    }, () => {
      this.resumable.upload();
    });
    Utils.registerGlobalVariable('uploader', 'isUploadProgressDialogShow', true);
  }

  cancelFileUpload = () => {
    this.resumable.files.pop(); //delete latest file；
    this.setState({isUploadRemindDialogShow: false});
  }

  render() {
    return (
      <Fragment>
        <div className="file-uploader-container">
          <div className="file-uploader">
            <input className="upload-input" type="file" ref={this.uploadInput} onClick={this.onClick}/>
          </div>
        </div>
        {this.state.isUploadRemindDialogShow &&
          <UploadRemindDialog
            currentResumableFile={this.state.currentResumableFile}
            replaceRepetitionFile={this.replaceRepetitionFile}
            uploadFile={this.uploadFile}
            cancelFileUpload={this.cancelFileUpload}
          />
        }
        {this.state.isUploadProgressDialogShow &&
          <UploadProgressDialog
            retryFileList={this.state.retryFileList}
            uploadFileList={this.state.uploadFileList}
            totalProgress={this.state.totalProgress}
            uploadBitrate={this.state.uploadBitrate}
            allFilesUploaded={this.state.allFilesUploaded}
            onCloseUploadDialog={this.onCloseUploadDialog}
            onCancelAllUploading={this.onCancelAllUploading}
            onUploadCancel={this.onUploadCancel}
            onUploadRetry={this.onUploadRetry}
            onUploadRetryAll={this.onUploadRetryAll}
          />
        }
      </Fragment>
    );
  }
}

FileUploader.propTypes = propTypes;

export default FileUploader;
