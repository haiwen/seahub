import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { DropdownToggle, Dropdown, DropdownMenu, DropdownItem, Tooltip} from 'reactstrap';
import { gettext, siteRoot, isDocs } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import toaster from '../toast';
import ModalPotal from '../modal-portal';
import ShareDialog from '../dialog/share-dialog';
import EditFileTagDialog from '../dialog/edit-filetag-dialog';

const propTypes = {
  path: PropTypes.string.isRequired,
  repoID: PropTypes.string.isRequired,
  repoTags: PropTypes.array.isRequired,
  userPerm: PropTypes.string.isRequired,
  repoEncrypted: PropTypes.bool.isRequired,
  enableDirPrivateShare: PropTypes.bool.isRequired,
  isGroupOwnedRepo: PropTypes.bool.isRequired,
  filePermission: PropTypes.string,
  fileTags: PropTypes.array.isRequired,
  onFileTagChanged: PropTypes.func.isRequired,
  showShareBtn: PropTypes.bool.isRequired,
  dirent: PropTypes.object,
};

class ViewFileToolbar extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isMoreMenuShow: false,
      isShareDialogShow: false,
      isEditTagDialogShow: false,
    };
  }

  onEditClick = (e) => {
    e.preventDefault();
    let { path, repoID } = this.props;
    let url = siteRoot + 'lib/' + repoID + '/file' + Utils.encodePath(path) + '?mode=edit';
    window.open(url);
  };

  toggleMore = () => {
    this.setState({isMoreMenuShow: !this.state.isMoreMenuShow});
  };

  onShareToggle = () => {
    this.setState({isShareDialogShow: !this.state.isShareDialogShow});
  };

  onEditFileTagToggle = () => {
    this.setState({isEditTagDialogShow: !this.state.isEditTagDialogShow});
  };

  onHistoryClick = () => {
    let historyUrl = siteRoot + 'repo/file_revisions/' + this.props.repoID + '/?p=' + Utils.encodePath(this.props.path);
    location.href = historyUrl;
  };

  render() {
    let { filePermission } = this.props;
    return (
      <Fragment>
        <div className="dir-operation">
          {(filePermission === 'rw' || filePermission === 'cloud-edit') && (
            <Fragment>
              <button className="btn btn-secondary operation-item" title={gettext('Edit File')} onClick={this.onEditClick}>{gettext('Edit')}</button>
            </Fragment>
          )}
          {filePermission === 'rw' && (
            <Dropdown isOpen={this.state.isMoreMenuShow} toggle={this.toggleMore}>
              <DropdownToggle className='btn btn-secondary operation-item'>
                {gettext('More')}
              </DropdownToggle>
              <DropdownMenu>
                {this.props.showShareBtn &&
                  <DropdownItem onClick={this.onShareToggle}>{gettext('Share')}</DropdownItem>
                }
                <DropdownItem onClick={this.onEditFileTagToggle}>{gettext('Tags')}</DropdownItem>
                <DropdownItem onClick={this.onHistoryClick}>{gettext('History')}</DropdownItem>
              </DropdownMenu>
            </Dropdown>
          )}
        </div>
        {this.state.isShareDialogShow && (
          <ModalPotal>
            <ShareDialog
              itemType={'file'}
              itemName={Utils.getFileName(this.props.path)}
              itemPath={this.props.path}
              repoID={this.props.repoID}
              repoEncrypted={this.props.repoEncrypted}
              enableDirPrivateShare={this.props.enableDirPrivateShare}
              userPerm={this.props.userPerm}
              isGroupOwnedRepo={this.props.isGroupOwnedRepo}
              toggleDialog={this.onShareToggle}
            />
          </ModalPotal>
        )}
        {this.state.isEditTagDialogShow && (
          <ModalPotal>
            <EditFileTagDialog
              filePath={this.props.path}
              repoID={this.props.repoID}
              repoTags={this.props.repoTags}
              fileTagList={this.props.fileTags}
              toggleCancel={this.onEditFileTagToggle}
              onFileTagChanged={this.props.onFileTagChanged}
            />
          </ModalPotal>
        )}
      </Fragment>
    );
  }
}

ViewFileToolbar.propTypes = propTypes;

export default ViewFileToolbar;
