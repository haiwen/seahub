import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';
import UploadListItem from './upload-list-item';

const propTypes = {
  totalProgress: PropTypes.number.isRequired,
  uploadFileList: PropTypes.array.isRequired,
  onMinimizeUploadDialog: PropTypes.func.isRequired,
  onCloseUploadDialog: PropTypes.func.isRequired,
  onUploadCancel: PropTypes.func.isRequired,
};

class UploadProgressDialog extends React.Component {

  onMinimizeUpload = (e) => {
    e.nativeEvent.stopImmediatePropagation();
    this.props.onMinimizeUploadDialog();
  }

  onCloseUpload = (e) => {
    e.nativeEvent.stopImmediatePropagation();
    this.props.onCloseUploadDialog();
  }

  render() {
    let uploadedMessage = gettext('File Upload');
    let uploadingMessage = gettext('File Uploading...') + this.props.totalProgress + '%';

    let uploadingOptions = (<span className="sf2-icon-minus" onClick={this.onMinimizeUpload}></span>);

    let uploadedOptions = (
      <Fragment>
        <span className="sf2-icon-minus" onClick={this.onMinimizeUpload}></span>
        <span className="sf2-icon-x1" onClick={this.onCloseUpload}></span>
      </Fragment>
    );

    let totalProgress = this.props.totalProgress;

    return (
      <div className="uploader-list-view">
        <div className="uploader-list-header">
          <div className="title">
            {totalProgress === 100 ? uploadedMessage : uploadingMessage}
          </div>
          <div className="uploader-options">
            {totalProgress === 100 ? uploadedOptions : uploadingOptions}
          </div>
        </div>
        <div className="uploader-list-content">
          <table>
            <tbody>
              {
                this.props.uploadFileList.map((item, index) => {
                  return (
                    <UploadListItem key={index} item={item} onUploadCancel={this.props.onUploadCancel}/>
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
