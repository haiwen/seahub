import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import FileUploaderListItem from './file-uploader-list-item';
import '../../css/upload-view.css';
import { gettext } from '../../utils/constants';

const propTypes = {
  uploadFileList: PropTypes.array.isRequired, 
};

class FileUploaderListView extends React.Component {

  onMinimizeUploader = () => {
    this.props.onMinimizeUploader();
  }

  onCloseUploader = () => {
    this.props.onCloseUploader();
  }

  render() {
    let uploadedMessage = gettext('File Upload');
    let uploadingMessage = gettext('File is upload...') + this.props.totalProgress;

    let uploadedOptions = (
      <Fragment>
        <span className="sf2-icon-minus" onClick={this.onMinimizeUploader}></span>
        <span className="sf2-icon-x1" onClick={this.onCloseUploader}></span>
      </Fragment>
    );
    let uploadingOptions = (<span className="sf2-icon-minus" onClick={this.onMinimizeUploader}></span>);

    let totalProgress = this.props.totalProgress;

    return (
      <div className="file-upload-module">
        <div className="file-upload-header">
          <div className="title">
            {totalProgress === "100%" ? uploadedMessage : uploadingMessage}
          </div>
          <div className="file-upload-options">
            {totalProgress === "100%" ? uploadedOptions : uploadingOptions}
          </div>
        </div>
        <div className="file-upload-container table-container">
          <table>
            <tbody>
              {
                this.props.uploadFileList.map((item, index) => {
                  return (
                    <FileUploaderListItem key={index} item={item} onUploaderCancel={this.props.onUploaderCancel}/>
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

FileUploaderListView.propTypes = propTypes;

export default FileUploaderListView;
