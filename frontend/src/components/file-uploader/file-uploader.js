import React from 'react';
import PropTypes from 'prop-types';
import Resumablejs from '@seafile/resumablejs';
import MD5 from 'MD5';
import { repoID } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import FileUploaderListView from './file-uploader-list-view';
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
  filePath: PropTypes.string.isRequired,
  onFileSuccess: PropTypes.func.isRequired,
};

class FileUploader extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isFileUploadListShow: false,
      uploaderFileList: [],
      totalProgress: '0%'
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

    this.resumable.assignBrowse(this.uploader, true);

    //Enable or Disable DragAnd Drop
    if (this.props.dragAndDrop === true) {
      this.resumable.enableDropOnDocument();
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
  }

  onFileAdded = (resumableFile) => {
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
    this.setUploaderFileList(resumable.files);
    resumable.upload();
  }

  setUploaderFileList = (files) => {
    let uploaderFileList = files.map(resumableFile => {
      let customFileObj = {
        uniqueIdentifier: resumableFile.uniqueIdentifier,
        resumableFile: resumableFile,
        progress: 0,
      };
      return customFileObj;
    });
    this.setState({
      isFileUploadListShow: true,
      uploaderFileList: [...this.state.uploaderFileList, ...uploaderFileList]
    });
  }

  onFileProgress = (file) => {
    this.updateUploaderFileList(file);
  }

  updateUploaderFileList = (file) => {
    let uniqueIdentifier = file.uniqueIdentifier;
    let uploaderFileList = this.state.uploaderFileList.map(item => {
      if (item.uniqueIdentifier === uniqueIdentifier) {
        item.progress = Math.round(file.progress() * 100);
      }
      return item;
    });

    this.setState({uploaderFileList: uploaderFileList});
  }

  onFileSuccess = (file) => {
    // this.props.onFileSuccess(file);
    //todos 更新显示列表；
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

  }

  onBeforeCancel = () => {

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
    return MD5(relativePath) + relativePath;
  }

  //component buisiness handler
  onClick = (e) => {
    e.nativeEvent.stopImmediatePropagation();
    e.stopPropagation();
  }

  onFileUploader = () => {
    this.uploader.removeAttribute('webkitdirectory');
    this.uploader.click();
  }

  onFolderUploader = () => {
    this.uploader.setAttribute('webkitdirectory', 'webkitdirectory');
    this.uploader.click();
  }

  //uploader list view handler
  onMinimizeUploader = () => {
    this.setState({isFileUploadListShow: false});
  }

  onCloseUploader = () => {
    this.setState({isFileUploadListShow: false, uploaderFileList: []});
  }

  onUploaderCancel = (resumableFile) => {
    let uploaderFileList = this.state.uploaderFileList.filter(item => {
      return item.uniqueIdentifier !== resumableFile.uniqueIdentifier;
    });
    let newUploaderFileList = uploaderFileList.map(item => {
      let progress = Math.round(item.file.progress() * 100);
      item.progress = progress;
      return item;
    });
    this.setState({uploaderFileList: newUploaderFileList});
  }

  onUploaderRetry = () => {

  }

  render() {
    return (
      <div className="file-uploader-container">
        <div className="file-uploader">
          <input className="uploader-input" type="file"  ref={node => this.uploader = node} onChange={this.onChange} onClick={this.onClick}/>
        </div>
        {
          this.state.isFileUploadListShow &&
          <FileUploaderListView 
            uploaderFileList={this.state.uploaderFileList}
            totalProgress={this.state.totalProgress}
            onMinimizeUploader={this.onMinimizeUploader}
            onCloseUploader={this.onCloseUploader}
            onUploaderCancel={this.onUploaderCancel}
          />
        }
      </div>
    );
  }
}

FileUploader.propTypes = propTypes;

export default FileUploader;
