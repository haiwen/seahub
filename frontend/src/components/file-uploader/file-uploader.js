import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import Resumablejs from '@seafile/resumablejs';
import MD5 from 'MD5';
import { enableResumableFileUpload } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import UploadProgressDialog from './upload-progress-dialog';
import UploadRemindDialog from '../dialog/upload-remind-dialog';
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
      uploadFileList: [],
      totalProgress: 0,
      isUploadProgressDialogShow: false,
      isUploadRemindDialogShow: false,
      currentResumableFile: null,
      uploadBitrate: '0'
    };

    this.uploadInput = React.createRef();

    this.notifiedFolders = [];

    this.timestamp = null;
    this.loaded = 0;
    this.bitrateInterval = 500; // Interval in milliseconds to calculate the bitrate
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
      chunkSize: this.props.chunkSize,
      simultaneousUploads: this.props.simultaneousUploads || 1,
      fileParameterName: this.props.fileParameterName,
      generateUniqueIdentifier: this.generateUniqueIdentifier,
      forceChunkSize: true,
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
    if (this.props.dragAndDrop === true) {
      this.resumable.disableDropOnDocument();
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

  onChunkingComplete = (file) => {
    if (file.relativePath !== file.fileName) {
      return; // is upload a folder;
    }
    if (enableResumableFileUpload) {
      let repoID = this.props.repoID;
      seafileAPI.getFileUploadedBytes(repoID, this.props.path, file.fileName).then(res => {
        let uploadedBytes = res.data.uploadedBytes;
        let offset = Math.floor(uploadedBytes / (1024 * 1024));
        file.markChunksCompleted(offset);
      });
    }
  }

  onFileAdded = (resumableFile, files) => {
    //get parent_dir、relative_path；
    let path = this.props.path === '/' ? '/' : this.props.path + '/';
    let fileName = resumableFile.fileName;
    let relativePath = resumableFile.relativePath;
    let isFile = fileName === relativePath;

    //update formdata；
    resumableFile.formData = {};
    if (isFile) {
      resumableFile.formData  = {
        parent_dir: path,
      };
    } else {
      let relative_path = relativePath.slice(0, relativePath.lastIndexOf('/') + 1);
      resumableFile.formData  = {
        parent_dir: path,
        relative_path: relative_path
      };
    }

    //check repetition
    //uploading is file and only upload one file
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
        this.resumable.upload();
      }
    } else {
      this.setUploadFileList(this.resumable.files);
      this.resumable.upload();
    }
  }

  filesAddedComplete = (resumable, files) => {
    // single file uploading can check repetition, because custom dialog conn't prevent program execution;
  }

  setUploadFileList = () => {
    let uploadFileList = this.resumable.files.map(resumableFile => {
      return this.buildCustomFileObj(resumableFile);
    });
    this.setState({
      isUploadProgressDialogShow: true,
      uploadFileList: uploadFileList,
    });
  }

  buildCustomFileObj = (resumableFile) => {
    return {
      uniqueIdentifier: resumableFile.uniqueIdentifier,
      resumableFile: resumableFile,
      progress: resumableFile.progress(),
      isSaved: resumableFile.progress() === 1 ? true : false, // The 'isSaved' property is not saved in resumableFile.
    };
  }

  onFileProgress = (file) => {
    let uniqueIdentifier = file.uniqueIdentifier;
    let uploadFileList = this.state.uploadFileList.map(item => {
      if (item.uniqueIdentifier === uniqueIdentifier) {
        item.progress = Math.round(file.progress() * 100);
      }
      return item;
    });

    this.setState({uploadFileList: uploadFileList});
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
      uploadBitrate = (loaded - this.loaded) * (1000 / timeDiff) * 8;
    }

    this.timestamp = now;
    this.loaded = loaded;

    uploadBitrate = Utils.formatBitRate(uploadBitrate);
    return uploadBitrate;
  }
  
  onProgress = () => {
    let progress = Math.round(this.resumable.progress() * 100);
    let uploadBitrate = this.getBitrate();
    this.setState({
      totalProgress: progress,
      uploadBitrate: uploadBitrate
    });
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
        if (item.resumableFile.uniqueIdentifier === resumableFile.uniqueIdentifier) {
          item.resumableFile.fileName = message.name;
          item.resumableFile.relativePath = relative_path + message.name;
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
        if (item.resumableFile.uniqueIdentifier === resumableFile.uniqueIdentifier) {
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
    this.props.onFileUploadSuccess(dirent); // this contance:  no repetition file

    let uploadFileList = this.state.uploadFileList.map(item => {
      if (item.resumableFile.uniqueIdentifier === resumableFile.uniqueIdentifier) {
        item.resumableFile.fileName = message.name;
        item.resumableFile.relativePath = message.name;
        item.isSaved = true;
      }
      return item;
    });
    this.setState({uploadFileList: uploadFileList});
  }

  onFileError = (file) => {

  }

  onComplete = () => {
    this.notifiedFolders = [];
  }

  onPause = () => {

  }

  onError = () => {

  }

  onFileRetry = () => {
    //todos, cancel upload file, uploded again;
  }

  onBeforeCancel = () => {
    //todos, giving a pop message ?
  }

  onCancel = () => {

  }

  setHeaders = (resumableFile, resumable) => {
    if (resumableFile.formData.replace) {
      return [];
    }
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
    this.uploadInput.current.click();
    let repoID = this.props.repoID;
    seafileAPI.getUploadLink(repoID, this.props.path).then(res => {
      this.resumable.opts.target = res.data;
    });
  }

  onFolderUpload = () => {
    this.uploadInput.current.setAttribute('webkitdirectory', 'webkitdirectory');
    this.uploadInput.current.click();
    let repoID = this.props.repoID;
    seafileAPI.getUploadLink(repoID, this.props.path).then(res => {
      this.resumable.opts.target = res.data;
    });
  }

  onDragStart = () => {
    let repoID = this.props.repoID;
    this.uploadInput.current.setAttribute('webkitdirectory', 'webkitdirectory');
    seafileAPI.getUploadLink(repoID, this.props.path).then(res => {
      this.resumable.opts.target = res.data;
    });
  }

  onCloseUploadDialog = () => {
    this.resumable.files = [];
    this.setState({isUploadProgressDialogShow: false, uploadFileList: []});
  }

  onUploadCancel = (uploadingItem) => {
    let uploadFileList = this.state.uploadFileList.filter(item => {
      if (item.uniqueIdentifier === uploadingItem.uniqueIdentifier) {
        uploadingItem.resumableFile.cancel();
        this.resumable.removeFile(uploadingItem.resumableFile.file);
      } else {
        return item;
      }
    });
    let newUploaderFileList = uploadFileList.map(item => {
      let progress = Math.round(item.resumableFile.progress() * 100);
      item.progress = progress;
      return item;
    });
    this.setState({uploadFileList: newUploaderFileList});
  }

  onCancelAllUploading = () => {
    let uploadFileList = this.state.uploadFileList.filter(item => {
      let resumableFile = item.resumableFile;
      if (Math.round(resumableFile.progress() !== 1)) {
        resumableFile.cancel();
        this.resumable.removeFile(resumableFile.file);
      } else {
        return item;
      }
    });
    this.setState({uploadFileList: uploadFileList});
  }

  onUploaderRetry = () => {

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
    });
  }
  
  uploadFile = () => {
    let resumableFile = this.resumable.files[this.resumable.files.length - 1];
    let fileObject = this.buildCustomFileObj(resumableFile);
    this.setState({
      isUploadRemindDialogShow: false,
      isUploadProgressDialogShow: true,
      uploadFileList: [...this.state.uploadFileList, fileObject]
    }, () => {
      this.resumable.upload();
    });
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
            uploadFileList={this.state.uploadFileList}
            totalProgress={this.state.totalProgress}
            onCloseUploadDialog={this.onCloseUploadDialog}
            onCancelAllUploading={this.onCancelAllUploading}
            onUploadCancel={this.onUploadCancel}
            uploadBitrate={this.state.uploadBitrate}
          />
        }
      </Fragment>
    );
  }
}

FileUploader.propTypes = propTypes;

export default FileUploader;
