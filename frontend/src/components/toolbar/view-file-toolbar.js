import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { DropdownToggle, Dropdown, DropdownMenu, DropdownItem, Tooltip} from 'reactstrap';
import { Utils } from '../../utils/utils';
import { gettext, siteRoot } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import ModalPotal from '../modal-portal';
import ShareDialog from '../dialog/share-dialog';
import EditFileTagDialog from '../dialog/edit-filetag-dialog';
import RelatedFileDialogs from '../dialog/related-file-dialogs';

const propTypes = {
  path: PropTypes.string.isRequired,
  repoID: PropTypes.string.isRequired,
  userPerm: PropTypes.string.isRequired,
  repoEncrypted: PropTypes.bool.isRequired,
  enableDirPrivateShare: PropTypes.bool.isRequired,
  isGroupOwnedRepo: PropTypes.bool.isRequired,
  filePermission: PropTypes.bool.isRequired,
  isDraft: PropTypes.bool.isRequired,
  hasDraft: PropTypes.bool.isRequired,
  fileTags: PropTypes.array.isRequired,
  relatedFiles: PropTypes.array.isRequired,
  onFileTagChanged: PropTypes.func.isRequired,
  onRelatedFileChange: PropTypes.func.isRequired,
};

class ViewFileToolbar extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isDraftMessageShow: false,
      isMoreMenuShow: false,
      isShareDialogShow: false,
      isEditTagDialogShow: false,
      isRelatedFileDialogShow: false,
      showRelatedFileDialog: false,
    };
  }

  onEditClick = (e) => {
    e.preventDefault();
    let { path, repoID } = this.props;
    let url = siteRoot + 'lib/' + repoID + '/file' + Utils.encodePath(path) + '?mode=edit';
    window.open(url);
  }

  onNewDraft = (e) => {
    e.preventDefault();
    let { path, repoID } = this.props;
    seafileAPI.createDraft(repoID, path).then(res => {
      window.location.href = siteRoot + 'lib/' + res.data.origin_repo_id + '/file' + res.data.draft_file_path + '?mode=edit';
    });
  }

  onDraftHover = () => {
    this.setState({isDraftMessageShow: !this.state.isDraftMessageShow});
  }

  toggleMore = () => {
    this.setState({isMoreMenuShow: !this.state.isMoreMenuShow});
  }

  onShareToggle = () => {
    this.setState({isShareDialogShow: !this.state.isShareDialogShow});
  }

  onEditFileTagToggle = () => {
    this.setState({isEditTagDialogShow: !this.state.isEditTagDialogShow});
  }

  onListRelatedFileToggle = () => {
    this.setState({
      isRelatedFileDialogShow: true,
      showRelatedFileDialog: true,
    });
  }

  toggleCancel = () => {
    this.setState({
      isRelatedFileDialogShow: false,
      showRelatedFileDialog: false,
    });
  }

  render() {

    let name = Utils.getFileName(this.props.path);
    let dirent = { name: name };

    return (
      <Fragment>
        <div className="dir-operation">
          {(this.props.filePermission && !this.props.hasDraft) && (
            <Fragment>
              <button className="btn btn-secondary operation-item" title={gettext('Edit File')} onClick={this.onEditClick}>{gettext('Edit')}</button>
            </Fragment>
          )}
          {/* default have read priv */}
          {(!this.props.isDraft && !this.props.hasDraft) && (
            <Fragment>
              <button id="new-draft" className="btn btn-secondary operation-item" onClick={this.onNewDraft}>{gettext('New Draft')}</button>
              <Tooltip target="new-draft" placement="bottom" isOpen={this.state.isDraftMessageShow} toggle={this.onDraftHover}>{gettext('Create a draft from this file, instead of editing it directly.')}</Tooltip>
            </Fragment>
          )}
          {this.props.filePermission && (
            <Dropdown isOpen={this.state.isMoreMenuShow} toggle={this.toggleMore}>
              <DropdownToggle className='btn btn-secondary operation-item'>
                {gettext('More')}
              </DropdownToggle>
              <DropdownMenu>
                <DropdownItem onClick={this.onShareToggle}>{gettext('Share')}</DropdownItem>
                <DropdownItem onClick={this.onEditFileTagToggle}>{gettext('Tags')}</DropdownItem>
                <DropdownItem onClick={this.onListRelatedFileToggle}>{gettext('Related Files')}</DropdownItem>
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
              fileTagList={this.props.fileTags}
              toggleCancel={this.onEditFileTagToggle}
              onFileTagChanged={this.props.onFileTagChanged}
            />
          </ModalPotal>
        )}
        {this.state.showRelatedFileDialog &&
          <ModalPotal>
            <RelatedFileDialogs
              repoID={this.props.repoID}
              filePath={this.props.path}
              relatedFiles={this.props.relatedFiles}
              toggleCancel={this.toggleCancel}
              onRelatedFileChange={this.props.onRelatedFileChange}
              dirent={dirent}
              viewMode="list_related_file"
            />
          </ModalPotal>
        }
      </Fragment>
    );
  }
}

ViewFileToolbar.propTypes = propTypes;

export default ViewFileToolbar;
