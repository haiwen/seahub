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
  isUploading: PropTypes.bool.isRequired,
  filesUploadedNum: PropTypes.number,
  allFilesNum: PropTypes.number,
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

  render() {
    const { totalProgress, uploadBitrate, uploadFileList, forbidUploadFileList, isUploading, filesUploadedNum, allFilesNum } = this.props;
    const uploadedCount = typeof filesUploadedNum === 'number' ? filesUploadedNum : uploadFileList.filter(file => file.isSaved).length;
    const totalCount = typeof allFilesNum === 'number' ? allFilesNum : uploadFileList.length;
    const filesUploadedMsg = gettext('{uploaded_files_num}/{all_files_num} Files')
      .replace('{uploaded_files_num}', uploadedCount)
      .replace('{all_files_num}', totalCount);
    let filesFailedMsg;
    if (!isUploading) {
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
            <DropdownToggle color="primary" caret>{gettext('Upload')}</DropdownToggle>
            <DropdownMenu>
              <DropdownItem onClick={this.props.onFileUpload}>{gettext('Upload Files')}</DropdownItem>
              <DropdownItem onClick={this.props.onFolderUpload}>{gettext('Upload Folder')}</DropdownItem>
            </DropdownMenu>
          </ButtonDropdown>
          <Button color="primary" outline={true} className="ml-4"
            onClick={this.props.onCancelAllUploading}
            disabled={!isUploading}>
            {gettext('Cancel All')}
          </Button>
        </div>
        {totalProgress > 0 && (
          <div id="upload-link-total-progress-container" className={`${!isUploading ? 'd-flex align-items-center' : ''} px-6 py-2`}>
            <div className="d-flex align-items-center flex-fill">
              {isUploading ? (
                <>
                  <span>{gettext('File Uploading...')}</span>
                  <span className="ml-2">{`${totalProgress}% (${Utils.formatBitRate(uploadBitrate)})`}</span>
                </>
              ) : (
                <>
                  {filesFailedMsg ?
                    <p className="m-0 error">{filesFailedMsg}</p> :
                    <p className="m-0">{gettext('All files uploaded')}</p>
                  }
                </>
              )}
              {uploadFileList.length > 0 && <span className="ml-auto">{filesUploadedMsg}</span>}
            </div>
            {isUploading && (
              <div className="progress">
                <div className="progress-bar" role="progressbar" style={{ width: `${totalProgress}%` }} aria-valuenow={totalProgress} aria-valuemin="0" aria-valuemax="100"></div>
              </div>
            )}
          </div>
        )}
        <div className="mh-2">
          <table className="table-thead-hidden">
            <thead>
              <tr>
                <th width="40%" scope="col">{gettext('name')}</th>
                <th width="15%" scope="col">{gettext('size')}</th>
                <th width="30%" scope="col">{gettext('progress')}</th>
                <th width="15%" scope="col">{gettext('state')}</th>
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
