import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { Button, ButtonDropdown, DropdownToggle, DropdownMenu, DropdownItem } from 'reactstrap';
import { Utils } from '../../utils/utils';
import { gettext } from '../../utils/constants';
import UploadListItem from './upload-list-item';
import ForbidUploadListItem from './forbid-upload-list-item';

const propTypes = {
  totalProgress: PropTypes.number.isRequired,
  uploadBitrate: PropTypes.number.isRequired,
  uploadFileList: PropTypes.array.isRequired,
  forbidUploadFileList: PropTypes.array.isRequired,
  onCancelAllUploading: PropTypes.func.isRequired,
  onUploadCancel: PropTypes.func.isRequired,
  onUploadRetry: PropTypes.func.isRequired,
  onFileUpload: PropTypes.func.isRequired,
  onFolderUpload: PropTypes.func.isRequired,
  allFilesUploaded: PropTypes.bool.isRequired
};

class UploadProgressDialog extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      dropdownOpen: false
    };
  }

  toggleDropdown = () => {
    this.setState({
      dropdownOpen: !this.state.dropdownOpen
    });
  };

  onDropdownToggleKeyDown = (e) => {
    if (e.key == 'Enter' || e.key == 'Space') {
      this.toggleDropdown();
    }
  };

  onMenuItemKeyDown = (e) => {
    if (e.key == 'Enter' || e.key == 'Space') {
      e.target.click();
    }
  };

  render() {
    const { totalProgress, allFilesUploaded, uploadBitrate, uploadFileList, forbidUploadFileList } = this.props;
    const filesUploadedMsg = gettext('{uploaded_files_num}/{all_files_num} Files')
      .replace('{uploaded_files_num}', uploadFileList.filter(file => file.isSaved).length)
      .replace('{all_files_num}', uploadFileList.length);
    let filesFailedMsg;
    if (totalProgress == 100) {
      const failedNum = uploadFileList.filter(file => file.error).length + forbidUploadFileList.length;
      if (failedNum > 0) {
        filesFailedMsg = gettext('{failed_files_num} file(s) failed to upload')
          .replace('{failed_files_num}', failedNum);
      }
    }
    return (
      <Fragment>
        <div className="text-center">
          <ButtonDropdown isOpen={this.state.dropdownOpen} toggle={this.toggleDropdown}>
            <DropdownToggle color="primary" caret onKeyDown={this.onDropdownToggleKeyDown}>{gettext('Upload')}</DropdownToggle>
            <DropdownMenu>
              <DropdownItem onClick={this.props.onFileUpload} onKeyDown={this.onMenuItemKeyDown}>{gettext('Upload Files')}</DropdownItem>
              <DropdownItem onClick={this.props.onFolderUpload} onKeyDown={this.onMenuItemKeyDown}>{gettext('Upload Folder')}</DropdownItem>
            </DropdownMenu>
          </ButtonDropdown>
          <Button color="primary" outline={true} className="ml-4"
            onClick={this.props.onCancelAllUploading}
            disabled={allFilesUploaded}>
            {gettext('Cancel All')}
          </Button>
        </div>
        {totalProgress > 0 && (
          <div id="upload-link-total-progress-container" className="d-flex align-items-center px-6">
            {totalProgress < 100 && (
              <>
                <span>{gettext('File Uploading...')}</span>
                <div className="upload-progress flex-fill mx-2">
                  <div className="progress-container d-flex align-items-center">
                    <div className="progress w-100">
                      <div className="progress-bar" role="progressbar" style={{width: `${totalProgress}%`}} aria-valuenow={totalProgress} aria-valuemin="0" aria-valuemax="100"></div>
                    </div>
                  </div>
                </div>
                <span>{`${totalProgress}% (${Utils.formatBitRate(uploadBitrate)})`}</span>
              </>
            )}
            {totalProgress == 100 && (
              <>
                {filesFailedMsg ?
                  <p className="m-0 mr-auto error">{filesFailedMsg}</p> :
                  <p className="m-0 mr-auto">{gettext('All files uploaded')}</p>
                }
              </>
            )}
            {uploadFileList.length > 0 && <span className="ml-4">{filesUploadedMsg}</span>}
          </div>
        )}
        <div className="mh-2">
          <table className="table-thead-hidden">
            <thead>
              <tr>
                <th width="35%">{gettext('name')}</th>
                <th width="15%">{gettext('size')}</th>
                <th width="35%">{gettext('progress')}</th>
                <th width="15%">{gettext('state')}</th>
              </tr>
            </thead>
            <tbody>
              {this.props.forbidUploadFileList.map((file, index) => {
                return (<ForbidUploadListItem key={index} file={file} />);
              })}
              {this.props.uploadFileList.map((resumableFile, index) => {
                return (
                  <UploadListItem
                    key={index}
                    resumableFile={resumableFile}
                    onUploadCancel={this.props.onUploadCancel}
                    onUploadRetry={this.props.onUploadRetry}
                  />
                );
              }).reverse()
              }
            </tbody>
          </table>
        </div>
      </Fragment>
    );
  }
}

UploadProgressDialog.propTypes = propTypes;

export default UploadProgressDialog;
