import React from 'react';
import PropTypes from 'prop-types';
import { repoID } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import ReactResumableJS from '../react-resumable/react-resumable-js';

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

  componentDidMount() {
    seafileAPI.getUploadLink(repoID, this.props.filePath).then(res => {
      this.setState({uploadLink: res.data});
    });
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
  
  onFileAdded = (uploaderFile, resumable) => {

    this.updateUploadFileList(uploaderFile);

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

  updateUploadFileList = (resumableFile) => {
    this.props.updateUploadFileList(resumableFile);
  }

  onClick = (e) => {
    e.nativeEvent.stopImmediatePropagation();
  }

  onFileProgress = (file, message) => {
    this.props.onFileProgress(file, message);
  }

  onProgress = (message) => {
    this.props.onProgress(message);
  }

  render() {
    return (
      <ReactResumableJS 
        forceChunkSize={true}
        maxFiles={undefined}
        setHeaders={this.setHeaders}
        showMessage={this.props.showMessage}
        isDirectory={this.props.isDirectory}
        onClick={this.onClick}
        onFileAdded={this.onFileAdded}
        onFileProgress={this.onFileProgress}
        onProgress={this.onProgress}
      >
      </ReactResumableJS>
    );
  }
}

FileUploader.propTypes = propTypes;

export default FileUploader;
