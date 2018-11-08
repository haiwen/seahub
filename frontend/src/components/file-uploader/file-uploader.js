import React from 'react';
import PropTypes from 'prop-types';
import Resumablejs from '@seafile/resumablejs';
import MD5 from 'MD5';
import { repoID } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import '../../css/file-uploader.css';

const propTypes = {
  filePath: PropTypes.string.isRequired,
};

class FileUploader extends React.Component {

  componentDidMount() {
    this.resumable = new Resumablejs({
      target: "",
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

    if (this.props.isDirectory) {
      this.resumable.assignBrowse(this.uploader, true);
    } else {
      this.resumable.assignBrowse(this.uploader);
    }

    //Enable or Disable DragAnd Drop
    if (this.props.dragAndDrop === true) {
      this.resumable.endableDropOnDocument();
    }

    seafileAPI.getUploadLink(repoID, this.props.filePath).then(res => {
      this.resumable.opts.target = res.data;
    });

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
    this.resumable.on('filesAddedComplete', this.filesAddedComplete)
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

  onFileAdded = (resumableFile) => {

    this.props.updateUploadFileList(resumableFile);

    //gererater file owner formData
    let filePath = this.props.filePath === '/' ? '/' : this.props.filePath + '/';
    let fileName = resumableFile.fileName;
    let relativePath = resumableFile.relativePath;
    let isFile = fileName === relativePath;
    resumableFile.formData = {};
    if (isFile) {
      resumableFile.formData  = {
        parent_dir: filePath,
      };
    } else {
      let relative_path = relativePath.slice(0, relativePath.lastIndexOf('/') + 1);
      resumableFile.formData  = {
        parent_dir: filePath,
        relative_path: relative_path
      };
    }
  }

  filesAddedComplete = (resumable) => {
    resumable.upload();
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

  setQuery = (resumableFile) => {
    let formData = resumableFile.formData;
    return formData;
  }

  generateUniqueIdentifier = (file) => {
    let relativePath = file.webkitRelativePath||file.relativePath||file.fileName||file.name;
    return MD5(relativePath) + relativePath;
  }

  onClick = (e) => {
    e.nativeEvent.stopImmediatePropagation();
    this.uploader.click();
  }

  render() {
    let { dragAndDrop } = this.props;

    if (!dragAndDrop) {
      return (
        <div className="file-uploader-container">
          <div className="file-uploader-placeholder" onClick={this.onClick}>{this.props.showMessage}</div>
          <input className="file-uploader-input" type="file"  ref={node => this.uploader = node} onChange={this.onChange} />
        </div>
      );
    }

    //for dragdrop;
    return (
      <div className="darg-drop-container" ref={uploader => this.uploader = uploader}></div>
    );
  }
}

FileUploader.propTypes = propTypes;

export default FileUploader;
