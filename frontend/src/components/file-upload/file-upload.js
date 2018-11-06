import React from 'react';
import PropTypes from 'prop-types';
import { repoID } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import ReactResumableJS from '../react-resumable/react-resumable-js';

const propTypes = {
  filePath: PropTypes.string.isRequired,
};

class FileUpload extends React.Component {

  constructor(props) {
    super(props);
  }
  
  headers = (fileobj, $) => {
    let chunkSize = $.getOpt('chunkSize');
    let startByte = 0;
    if ($.offset !== 0) {
      startByte = $.offset * chunkSize;
    }
    let endByte = Math.min($.fileObjSize, ($.offset+1)*chunkSize) - 1;
    if ($.fileObjSize-$.endByte < chunkSize && !$.getOpt('forceChunkSize')) {
      endByte = $.fileObjSize;
    }
    
    let headers = {
      'Accept': 'application/json; text/javascript, */*; q=0.01',
      'Content-Disposition': 'attachment; filename="' + encodeURI(fileobj.fileName) + '"',
      'Content-Range': 'bytes ' + startByte + '-' + endByte + '/' + $.fileObjSize,
    };
    
    return headers;
  }
  
  onFileAdded = (uploaderFile, resumable) => {
    this.updateUploadFileList(uploaderFile);  //

    let filePath = this.props.filePath === '/' ? '/' : this.props.filePath + '/';
    seafileAPI.getUploadLink(repoID, filePath).then(uploadUrl => {
      //todos: 处理闭包问题；
      (function(){
        resumable.opts.target = uploadUrl.data;
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

        resumable.upload();
      })(uploadUrl, uploaderFile, resumable);
    });
  }

  updateUploadFileList = (resumableFile) => {
    this.props.updateUploadFileList(resumableFile);
  }

  onClick = (e) => {
    e.nativeEvent.stopImmediatePropagation();
  }

  render() {
    return (
      <ReactResumableJS 
        forceChunkSize={true}
        maxFiles={undefined}
        headerObject={this.headers}
        showMessage={this.props.showMessage}
        isDirectory={this.props.isDirectory}
        onClick={this.onClick}
        onFileAdded={this.onFileAdded}
        onFileProgress={this.onFileProgress}
      >
      </ReactResumableJS>
    );
  }
}

FileUpload.propTypes = propTypes;

export default FileUpload;
