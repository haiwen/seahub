import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import UploadListItem from './upload-list-item';
import ForbidUploadListItem from './forbid-upload-list-item';
import Icon from '../icon';

const propTypes = {
  uploadBitrate: PropTypes.number.isRequired,
  totalProgress: PropTypes.number.isRequired,
  retryFileList: PropTypes.array.isRequired,
  uploadFileList: PropTypes.array.isRequired,
  forbidUploadFileList: PropTypes.array.isRequired,
  onCloseUploadDialog: PropTypes.func.isRequired,
  onCancelAllUploading: PropTypes.func.isRequired,
  onUploadCancel: PropTypes.func.isRequired,
  onUploadRetry: PropTypes.func.isRequired,
  onUploadRetryAll: PropTypes.func.isRequired,
  isUploading: PropTypes.bool.isRequired
};

class UploadProgressDialog extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isMinimized: false
    };
  }

  onCancelAllUploading = () => {
    this.props.onCancelAllUploading();
  };

  onMinimizeUpload = (e) => {
    e.nativeEvent.stopImmediatePropagation();
    this.setState({ isMinimized: !this.state.isMinimized });
  };

  onCloseUpload = (e) => {
    e.nativeEvent.stopImmediatePropagation();
    this.props.onCloseUploadDialog();
  };

  render() {
    const { totalProgress, retryFileList, uploadBitrate, uploadFileList, forbidUploadFileList, isUploading } = this.props;

    const filesUploadedMsg = gettext('{uploaded_files_num}/{all_files_num} Files')
      .replace('{uploaded_files_num}', uploadFileList.filter(file => file.isSaved).length)
      .replace('{all_files_num}', uploadFileList.length);

    let filesFailedMsg;
    if (!isUploading) {
      const failedNum = uploadFileList.filter(file => file.error).length + forbidUploadFileList.length;
      if (failedNum > 0) {
        filesFailedMsg = gettext('{failed_files_num} file(s) failed to upload')
          .replace('{failed_files_num}', failedNum);
      }
    }

    return (
      <div className="uploader-list-view mw-100" style={{ height: this.state.isMinimized ? document.querySelector('.uploader-list-header').offsetHeight : '20rem' }}>
        <div className="uploader-list-header flex-shrink-0">
          <div>
            {isUploading ? (
              <>
                <span>{gettext('File Uploading...')}</span>
                <span className="ml-2">{`${totalProgress}% (${Utils.formatBitRate(uploadBitrate)})`}</span>
                <div className="progress">
                  <div className="progress-bar" role="progressbar" style={{ width: `${totalProgress}%` }} aria-valuenow={totalProgress} aria-valuemin="0" aria-valuemax="100"></div>
                </div>
              </>
            ) : (
              <>
                {filesFailedMsg ?
                  <p className="m-0 error">{filesFailedMsg}</p> :
                  <p className="m-0">{gettext('All files uploaded')}</p>
                }
              </>
            )}
          </div>
          <div className="upload-dialog-op-container">
            <span className="upload-dialog-op" role="button" tabIndex="0" onClick={this.onMinimizeUpload}>
              <Icon symbol="minus" />
            </span>
            {!isUploading && (
              <span className="upload-dialog-op" role="button" tabIndex="0" onClick={this.onCloseUpload}>
                <Icon symbol="x-01" />
              </span>
            )}
          </div>
        </div>
        <div className="uploader-list-content">
          <div className="d-flex justify-content-between align-items-center border-bottom uploader-content-bar">
            {uploadFileList.length > 0 && <span>{filesUploadedMsg}</span>}
            <div className="ml-auto">
              <button
                className="btn btn-lg border-0 background-transparent px-0"
                onClick={this.props.onUploadRetryAll}
                disabled={retryFileList.length == 0}
              >
                {gettext('Retry All')}
              </button>
              <button
                className="btn btn-lg border-0 background-transparent px-0 ml-3"
                onClick={this.props.onCancelAllUploading}
                disabled={!isUploading}
              >
                {gettext('Cancel All')}
              </button>
            </div>
          </div>
          <table className="table-thead-hidden">
            <thead>
              <tr>
                <th width="40%">{gettext('name')}</th>
                <th width="15%">{gettext('size')}</th>
                <th width="30%">{gettext('progress')}</th>
                <th width="15%">{gettext('state')}</th>
              </tr>
            </thead>
            <tbody>
              {
                this.props.forbidUploadFileList.map((file, index) => {
                  return (<ForbidUploadListItem key={index} file={file} />);
                })
              }
              {
                this.props.uploadFileList.map((resumableFile, index) => {
                  return (
                    <UploadListItem
                      key={index}
                      resumableFile={resumableFile}
                      onUploadCancel={this.props.onUploadCancel}
                      onUploadRetry={this.props.onUploadRetry}
                    />
                  );
                })
              }
            </tbody>
          </table>
        </div>
      </div>
    );
  }
}

UploadProgressDialog.propTypes = propTypes;

export default UploadProgressDialog;
