import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { Button, ButtonDropdown, DropdownToggle, DropdownMenu, DropdownItem } from 'reactstrap';
import { gettext } from '../../utils/constants';
import UploadListItem from './upload-list-item';
import ForbidUploadListItem from './forbid-upload-list-item';

const propTypes = {
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
  }

  onDropdownToggleKeyDown = (e) => {
    if (e.key == 'Enter' || e.key == 'Space') {
      this.toggleDropdown();
    }
  }

  onMenuItemKeyDown = (e) => {
    if (e.key == 'Enter' || e.key == 'Space') {
      e.target.click();
    }
  }

  render() {
    let { allFilesUploaded } = this.props;
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
        <div className="mt-4 mh-2">
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
