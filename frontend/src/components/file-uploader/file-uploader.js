import React from 'react';
import PropTypes from 'prop-types';
import Resumablejs from '@seafile/resumablejs';
import MD5 from 'MD5';
import { repoID, enableResumableFileUpload } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import UploadProgressDialog from './upload-progress-dialog';
import UploadRemindDialog from '../dialog/upload-remind-dialog';
import '../../css/file-uploader.css';

const propTypes = {
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
  onFileSuccess: PropTypes.func.isRequired,
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
    };
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

    this.resumable.assignBrowse(this.uploadInput, true);

    //Enable or Disable DragAnd Drop
    if (this.props.dragAndDrop === true) {
      this.resumable.enableDropOnDocument();
    }

    this.bindCallbackHandler();
    this.bindEventHandler();
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
    this.resumable.on('chunkingComplete', this.onChunkingComplete);
    this.resumable.on('fileAdded', this.onFileAdded);
    this.resumable.on('filesAddedComplete', this.filesAddedComplete);
    this.resumable.on('fileProgress', this.onFileProgress);
    this.resumable.on('fileSuccess', this.onFileSuccess);
    this.resumable.on('progress', this.onProgress);
    this.resumable.on('complete', this.onComplete);
    this.resumable.on('pause', this.onPause);
    this.resumable.on('fileRetry', this.onFileRetry);
    this.resumable.on('fileError', this.onFileError);
    this.resumable.on('error', this.onError);
    this.resumable.on('beforeCancel', this.onBeforeCancel);
    this.resumable.on('cancel', this.onCancel);
    this.resumable.on('dragstart', this.onDragStart);
  }

  onChunkingComplete = (file) => {
    if (file.relativePath !== file.fileName) {
      return; // is upload a folder;
    }
    if (enableResumableFileUpload) {
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
        resumableFile.upload();
      }
    } else {
      this.setUploadFileList(this.resumable.files);
      resumableFile.upload();
    }
  }

  filesAddedComplete = (resumable, files) => {
    // single file uploading can check repetition, because custom dialog conn't prevent program execution;
  }

  setUploadFileList = (files) => {
    let uploadFileList = files.map(resumableFile => {
      return this.buildCustomFileObj(resumableFile);
    });
    this.setState({
      isUploadRemindDialogShow: false,
      isUploadProgressDialogShow: true,
      uploadFileList: uploadFileList
    });
  }

  buildCustomFileObj = (resumableFile) => {
    return {
      uniqueIdentifier: resumableFile.uniqueIdentifier,
      resumableFile: resumableFile,
      progress: resumableFile.progress(),
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

  onFileSuccess = (file) => {
    // todos, update uploadList or updateList;
  }

  onFileError = (file) => {

  }

  onProgress = () => {
    let progress = Math.round(this.resumable.progress() * 100);
    this.setState({totalProgress: progress});
  }

  onComplete = () => {

  }

  onPause = () => [

  ]

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
    this.uploadInput.removeAttribute('webkitdirectory');
    this.uploadInput.click();
    seafileAPI.getUploadLink(repoID, this.props.path).then(res => {
      this.resumable.opts.target = res.data;
    });
  }

  onFolderUpload = () => {
    this.uploadInput.setAttribute('webkitdirectory', 'webkitdirectory');
    this.uploadInput.click();
    seafileAPI.getUploadLink(repoID, this.props.path).then(res => {
      this.resumable.opts.target = res.data;
    });
  }

  onDragStart = () => {
    this.uploadInput.setAttribute('webkitdirectory', 'webkitdirectory');
    seafileAPI.getUploadLink(repoID, this.props.path).then(res => {
      this.resumable.opts.target = res.data;
    });
  }

  onMinimizeUploadDialog = () => {
    this.setState({isUploadProgressDialogShow: false});
  }

  onCloseUploadDialog = () => {
    this.setState({isUploadProgressDialogShow: false, uploadFileList: []});
  }

  onUploadCancel = (resumableFile) => {
    let uploadFileList = this.state.uploadFileList.filter(item => {
      return item.uniqueIdentifier !== resumableFile.uniqueIdentifier;
    });
    let newUploaderFileList = uploadFileList.map(item => {
      let progress = Math.round(item.resumableFile.progress() * 100);
      item.progress = progress;
      return item;
    });
    this.setState({uploadFileList: newUploaderFileList});
  }

  onUploaderRetry = () => {

  }

  replaceRepetitionFile = () => {
    let resumableFile =  this.resumable.files[this.resumable.files.length - 1];
    resumableFile.formData['replace'] = 1;

    // this.setState({isUploadRemindDialogShow: false});

    this.setUploadFileList(this.resumable.files);

    this.resumable.upload();
  }

  uploadFile = () => {
    // this.setState({isUploadRemindDialogShow: false});

    this.setUploadFileList(this.resumable.files);
    this.resumable.upload();
  }

  cancelFileUpload = () => {
    this.resumable.files.pop(); //delete latest file；
    this.setState({isUploadRemindDialogShow: false});
  }

  render() {
    return (
      <div className="file-uploader-container">
        <div className="file-uploader">
          <input className="upload-input" type="file" ref={node => this.uploadInput = node} onClick={this.onClick}/>
        </div>
        {
          this.state.isUploadProgressDialogShow &&
          <UploadProgressDialog
            uploadFileList={this.state.uploadFileList}
            totalProgress={this.state.totalProgress}
            onMinimizeUploadDialog={this.onMinimizeUploadDialog}
            onCloseUploadDialog={this.onCloseUploadDialog}
            onUploadCancel={this.onUploadCancel}
          />
        }
        {
          this.state.isUploadRemindDialogShow &&
          <UploadRemindDialog
            currentResumableFile={this.state.currentResumableFile}
            replaceRepetitionFile={this.replaceRepetitionFile}
            uploadFile={this.uploadFile}
            cancelFileUpload={this.cancelFileUpload}
          />
        }
      </div>
    );
  }
}

FileUploader.propTypes = propTypes;

export default FileUploader;
