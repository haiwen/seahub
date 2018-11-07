import React from 'react';
import PropTypes from 'prop-types';
import Resumablejs from '@seafile/resumablejs';
import { repoID } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import '../../css/file-uploader.css';

const propTypes = {
  filePath: PropTypes.string.isRequired,
};

class FileUploader extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      uploadLink: ''
    };
  }

  componentWillMount() {
    seafileAPI.getUploadLink(repoID, this.props.filePath).then(res => {
      this.state.uploadLink = res.data;
    });
  }

  componentDidMount() {
    let ResumableField = new Resumablejs({
      target: this.props.service,
      query: this.query || {},
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
      generateUniqueIdentifier: this.props.generateUniqueIdentifier,
      forceChunkSize: true,
    });

    this.resumable = ResumableField;

    if (this.props.isDirectory) {
      this.resumable.assignBrowse(this.uploader, true);
    } else {
      this.resumable.assignBrowse(this.uploader);
    }

    //Enable or Disable DragAnd Drop
    if (this.props.disableDragAndDrop === false) {
      this.resumable.assignDrop(this.dropZone);
    }

    this.bindBusinessHandler();
  }

  bindBusinessHandler() {
    this.bindCallBackHandler();
    this.bindEventHandler();
  }

  bindCallBackHandler = () => {
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
    this.resumable.on('fileAdded', this.onFileAdded)
    this.resumable.on('filesAdded', this.onFilesAdded)
    this.resumable.on('uploadStart', this.onUploadStard)
    this.resumable.on('fileProgress', this.onFileProgress)
    this.resumable.on('fileSuccess', this.onFileSuccess)
    this.resumable.on('progress', this.onProgress)
    this.resumable.on('complete', this.onComplete)
    this.resumable.on('pause', this.onPause)
    this.resumable.on('fileRetry', this.onFileRetry)
    this.resumable.on('fileError', this.onFileError)
    this.resumable.on('error', this.onError)
    this.resumable.on('beforeCancel', this.onBeforeCancel)
    this.resumable.on('cancel', this.onCancel)
  }

  onFileAdded = (uploaderFile) => {

    this.props.updateUploadFileList(uploaderFile);
    
    let resumable = this.resumable;
    let filePath = this.props.filePath === '/' ? '/' : this.props.filePath + '/';
    let fileName = uploaderFile.fileName;
    let relativePath = uploaderFile.relativePath;
    let isFile = fileName === relativePath;
    if (isFile) {
      resumable.opts.query = {
        parent_dir: filePath,
      };
    } else {
      let relative_path = relativePath.slice(0, relativePath.lastIndexOf('/') + 1);
      resumable.opts.query = {
        parent_dir: filePath,
        relative_path: relative_path
      };
    }
    resumable.opts.target = this.state.uploadLink;
    resumable.upload();
  }

  onFilesAdded = () => {

  }

  onUploadStard = () => {

  }  

  onFileProgress = (file) => {
    if (this.props.onFileProgress) {
      this.props.onFileProgress(file, file.progress());
    }
  }

  onFileSuccess = () => {

  }

  onFileError = () => {

  }

  onProgress = () => {
    if (this.props.onProgress) {
      this.props.onProgress(this.resumable.progress());
    }
  }

  onComplete = () => {

  }

  onPause = () => [

  ]

  onError = () => {

  }

  onFileRetry = () => {

  }

  onBeforeCancel = () => {

  }

  onCancel = () => {
    if (this.props.onCancel) {
      this.props.onCancel();
    }
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

  onClick = (e) => {
    e.nativeEvent.stopImmediatePropagation();
    this.uploader.click();
  }

  onChange = () => {
    this.resumable.upload();
  }

  render() {
    let { drop } = this.props;

    if (!drop) {
      return (
        <div className="file-uploader-container">
          <div className="file-uploader-placeholder" onClick={this.onClick}>{this.props.showMessage}</div>
          <input className="file-uploader-input" type="file"  ref={node => this.uploader = node} onChange={this.onChange} />
        </div>
      );
    }

    //for dragdrop;
    return (
      <div className="file-uploader-container" ref={node => this.uploader = node}></div>
    );
  }
}

FileUploader.propTypes = propTypes;

export default FileUploader;
