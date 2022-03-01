import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import UploadListItem from './upload-list-item';
import ForbidUploadListItem from './forbid-upload-list-item';

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
  allFilesUploaded: PropTypes.bool.isRequired,
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
  }

  onMinimizeUpload = (e) => {
    e.nativeEvent.stopImmediatePropagation();
    this.setState({isMinimized: !this.state.isMinimized});
  }

  onCloseUpload = (e) => {
    e.nativeEvent.stopImmediatePropagation();
    this.props.onCloseUploadDialog();
  }

  render() {

    let uploadBitrate = Utils.formatBitRate(this.props.uploadBitrate);
    let uploadedMessage = gettext('File Upload');
    let uploadingMessage = gettext('File Uploading...') + ' ' + this.props.totalProgress + '% (' + uploadBitrate + ')';

    let uploadingOptions = (<span className="sf2-icon-minus" onClick={this.onMinimizeUpload}></span>);

    let uploadedOptions = (
      <Fragment>
        <span className="sf2-icon-minus" onClick={this.onMinimizeUpload}></span>
        <span className="sf2-icon-x1" onClick={this.onCloseUpload}></span>
      </Fragment>
    );

    let { totalProgress, allFilesUploaded, retryFileList } = this.props;

    return (
      <div className="uploader-list-view mw-100" style={{height: this.state.isMinimized ? '2.25rem' : '20rem'}}>
        <div className="uploader-list-header">
          <div className="title">
            {totalProgress === 100 ? uploadedMessage : uploadingMessage}
          </div>
          <div className="uploader-options">
            {totalProgress === 100 ||  allFilesUploaded ? uploadedOptions : uploadingOptions}
          </div>
        </div>
        <div className="uploader-list-content">
          <div className="text-right mt-2">
            {retryFileList.length > 0 ?
              <span className="cursor-pointer" onClick={this.props.onUploadRetryAll}>{gettext('Retry All')}</span>
              :
              <span className="cursor-pointer disabled-link">{gettext('Retry All')}</span>
            }
            {!allFilesUploaded ?
              <span className="cursor-pointer ml-3" onClick={this.onCancelAllUploading}>{gettext('Cancel All')}</span>
              :
              <span className="cursor-pointer ml-3 disabled-link" >{gettext('Cancel All')}</span>
            }
          </div>
          <table className="table-thead-hidden">
            <thead>
              <tr>
                <th width="30%">{gettext('name')}</th>
                <th width="20%">{gettext('size')}</th>
                <th width="30%">{gettext('progress')}</th>
                <th width="20%">{gettext('state')}</th>
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
