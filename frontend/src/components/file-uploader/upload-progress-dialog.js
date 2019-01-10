import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';
import UploadListItem from './upload-list-item';

const propTypes = {
  uploadBitrate: PropTypes.string.isRequired,
  totalProgress: PropTypes.number.isRequired,
  uploadFileList: PropTypes.array.isRequired,
  onCloseUploadDialog: PropTypes.func.isRequired,
  onCancelAllUploading: PropTypes.func.isRequired,
  onUploadCancel: PropTypes.func.isRequired,
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
    let uploadedMessage = gettext('File Upload');
    let uploadingMessage = gettext('File Uploading...') + ' ' + this.props.totalProgress + '%' + ' (' + this.props.uploadBitrate + ')';

    let uploadingOptions = (<span className="sf2-icon-minus" onClick={this.onMinimizeUpload}></span>);

    let uploadedOptions = (
      <Fragment>
        <span className="sf2-icon-minus" onClick={this.onMinimizeUpload}></span>
        <span className="sf2-icon-x1" onClick={this.onCloseUpload}></span>
      </Fragment>
    );

    let totalProgress = this.props.totalProgress;

    return (
      <div className="uploader-list-view" style={{height: this.state.isMinimized ? '2.25rem' : '20rem'}}>
        <div className="uploader-list-header">
          <div className="title">
            {totalProgress === 100 ? uploadedMessage : uploadingMessage}
          </div>
          <div className="uploader-options">
            {totalProgress === 100 ? uploadedOptions : uploadingOptions}
          </div>
        </div>
        <div className="uploader-list-content">
          <table className="table-thead-hidden">
            <thead>
              <tr>
                <th width="45%">{gettext('name')}</th>
                <th width="40%">{gettext('progress')}</th>
                <th width="15%">{gettext('state')}</th>
              </tr>
            </thead>
            <tbody>
              {(this.props.totalProgress !== 100) && 
                <tr><td className="text-right" colSpan={3}><span className="cursor-pointer" onClick={this.onCancelAllUploading}>{gettext('Cancel All')}</span></td></tr>
              }
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
