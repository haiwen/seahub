import React from 'react';
import PropTypes from 'prop-types';
import Resumablejs from '@seafile/resumablejs';
import '../../css/react-resumable.css';

const propTypes = {

};

class ReactResumableJS extends React.Component {

  componentDidMount() {
    let ResumableField = new Resumablejs({
      target: this.props.service,
      query: this.props.query || {},
      fileType: this.props.filetypes,
      maxFiles: this.props.maxFiles,
      maxFileSize: this.props.maxFileSize,
      testMethod: this.props.testMethod || 'post',
      testChunks: this.props.testChunks || false,
      headers: this.props.setHeaders || {},
      withCredentials: this.props.withCredentials || false,
      chunkSize: this.props.chunkSize,
      simultaneousUploads: this.props.simultaneousUploads || 1,
      fileParameterName: this.props.fileParameterName,
      generateUniqueIdentifier: this.props.generateUniqueIdentifier,
      forceChunkSize: this.props.forceChunkSize
    });

    this.resumeable = ResumableField;

    if (this.props.isDirectory) {
      this.resumeable.assignBrowse(this.uploader, true);
    } else {
      this.resumeable.assignBrowse(this.uploader);
    }

    //Enable or Disable DragAnd Drop
    if (this.props.disableDragAndDrop === false) {
      this.resumeable.assignDrop(this.dropZone);
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
      this.resumeable.opts.maxFilesErrorCallback = this.props.maxFilesErrorCallback;
    }

    if (minFileSizeErrorCallback) {
      this.resumeable.opts.minFileSizeErrorCallback = this.props.minFileSizeErrorCallback;
    }

    if (maxFileSizeErrorCallback) {
      this.resumeable.opts.maxFileSizeErrorCallback = this.props.maxFileSizeErrorCallback;
    }

    if (fileTypeErrorCallback) {
      this.resumeable.opts.fileTypeErrorCallback = this.props.fileTypeErrorCallback;
    }

  }

  bindEventHandler = () => {
    this.resumeable.on('fileAdded', this.onFileAdded)
    this.resumeable.on('filesAdded', this.onFilesAdded)
    this.resumeable.on('uploadStart', this.onUploadStard)
    this.resumeable.on('fileProgress', this.onFileProgress)
    this.resumeable.on('fileSuccess', this.onFileSuccess)
    this.resumeable.on('progress', this.onProgress)
    this.resumeable.on('complete', this.onComplete)
    this.resumeable.on('pause', this.onPause)
    this.resumeable.on('fileRetry', this.onFileRetry)
    this.resumeable.on('fileError', this.onFileError)
    this.resumeable.on('error', this.onError)
    this.resumeable.on('beforeCancel', this.onBeforeCancel)
    this.resumeable.on('cancel', this.onCancel)
  }

  onFileAdded = (file, e) => {
    if (this.props.onFileAdded) {
      this.props.onFileAdded(file, this.resumeable);
    }
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
      this.props.onProgress(this.resumeable.progress());
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

  onChange = () => {
    this.resumeable.upload();
  }

  onClick = (e) => {
    e.nativeEvent.stopImmediatePropagation();
    this.uploader.click();
  }

  render() {
    return (
      <div className="sf-resumable-input-container">
        <input className="resumable-input" ref={node => this.uploader = node} type="file" onChange={this.onChange}></input>
        <div className="input-placeholder" onClick={this.onClick}>{this.props.showMessage}</div>
      </div>
    );
  }
}

ReactResumableJS.propTypes = propTypes;

export default ReactResumableJS;
