import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { DropdownToggle, Dropdown, DropdownMenu, DropdownItem, Tooltip } from 'reactstrap';
import { Utils } from '../../utils/utils';
import { gettext, siteRoot } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import CommonToolbar from '../../components/toolbar/common-toolbar';
import ViewModeToolbar from '../../components/toolbar/view-mode-toolbar';
import DirOperationToolBar from '../../components/toolbar/dir-operation-toolbar';
import MutipleDirOperationToolbar from '../../components/toolbar/mutilple-dir-operation-toolbar';
import ModalPotal from '../../components/modal-portal';
import ShareDialog from '../../components/dialog/share-dialog';
import EditFileTagDialog from '../../components/dialog/edit-filetag-dialog';
import AddRelatedFileDialog from '../../components/dialog/add-related-file-dialog';
import FileTag from '../../models/file-tag';

const propTypes = {
  isViewFile: PropTypes.bool.isRequired,
  filePermission: PropTypes.bool.isRequired, // ture = 'rw'
  isDraft: PropTypes.bool.isRequired,
  hasDraft: PropTypes.bool.isRequired,
  // side-panel
  onSideNavMenuClick: PropTypes.func.isRequired,
  // mutiple-dir
  isDirentSelected: PropTypes.bool.isRequired,
  repoID: PropTypes.string.isRequired,
  path: PropTypes.string.isRequired,
  selectedDirentList: PropTypes.array.isRequired,
  onItemsMove: PropTypes.func.isRequired,
  onItemsCopy: PropTypes.func.isRequired,
  onItemsDelete: PropTypes.func.isRequired,
  // dir
  direntList: PropTypes.array.isRequired,
  repoName: PropTypes.string.isRequired,
  repoEncrypted: PropTypes.bool.isRequired,
  isGroupOwnedRepo: PropTypes.bool.isRequired,
  userPerm: PropTypes.string.isRequired,
  showShareBtn: PropTypes.bool.isRequired,
  enableDirPrivateShare: PropTypes.bool.isRequired,
  onAddFile: PropTypes.func.isRequired,
  onAddFolder: PropTypes.func.isRequired,
  onUploadFile: PropTypes.func.isRequired,
  onUploadFolder: PropTypes.func.isRequired,
  // view-mode
  currentMode: PropTypes.string.isRequired,
  switchViewMode: PropTypes.func.isRequired,
  // search
  onSearchedClick: PropTypes.func.isRequired,
  onColumnFileTagChanged: PropTypes.func.isRequired,
};

class LibContentToolbar extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isDraftMessageShow: false,
      isMoreMenuShow: false,
      isShareDialogShow: false,
      isEditTagDialogShow: false,
      isFileRelativeDialogShow: false,
      fileTags: [],
    };
  }

  componentWillReceiveProps(nextProps) {
    let { isViewFile } = nextProps;
    let { path, repoID } = this.props;
    if (isViewFile && path) {
      seafileAPI.listFileTags(repoID, path).then(res => {
        let fileTags = res.data.file_tags.map(item => {
          return new FileTag(item);
        });

        this.setState({fileTags: fileTags});
      });
    }
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

  onEditRelativeFileToggle = () => {
    this.setState({isFileRelativeDialogShow: !this.state.isFileRelativeDialogShow});
  }

  onFileTagChanged = () => {
    let { repoID, path } = this.props;
    seafileAPI.listFileTags(repoID, path).then(res => {
      let fileTags = res.data.file_tags.map(item => {
        return new FileTag(item);
      });

      this.setState({fileTags: fileTags});
      this.props.onColumnFileTagChanged();
    });
  }

  render() {
    if (this.props.isViewFile) {
      let name = Utils.getFileName(this.props.path);
      let dirent = { name: name };
      return (
        <Fragment>
          <div className="cur-view-toolbar">
            <span className="sf2-icon-menu hidden-md-up d-md-none side-nav-toggle" title={gettext('Side Nav Menu')} onClick={this.props.onSideNavMenuClick}></span>
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
                    <DropdownItem onClick={this.onEditFileTagToggle}>{gettext('Edit File Tag')}</DropdownItem>
                    <DropdownItem onClick={this.onEditRelativeFileToggle}>{gettext('Edit Relative File')}</DropdownItem>
                  </DropdownMenu>
                </Dropdown>
              )}
            </div>
            <ViewModeToolbar currentMode={this.props.currentMode} switchViewMode={this.props.switchViewMode}/>
          </div>
          <CommonToolbar repoID={this.props.repoID} onSearchedClick={this.props.onSearchedClick} searchPlaceholder={gettext('Search files in this library')}/>
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
                fileTagList={this.state.fileTags}
                toggleCancel={this.onEditFileTagToggle}
                onFileTagChanged={this.onFileTagChanged}
              />
            </ModalPotal>
          )}
          {this.state.isFileRelativeDialogShow &&
            <ModalPotal>
              <AddRelatedFileDialog
                dirent={dirent}
                repoID={this.props.repoID}
                filePath={this.props.path}
                onRelatedFileChange={this.props.onRelatedFileChange}
                toggleCancel={this.onEditRelativeFileToggle}
              />
            </ModalPotal>
          }
        </Fragment>
      );
    }

    return (
      <Fragment>
        <div className="cur-view-toolbar">
          <span className="sf2-icon-menu hidden-md-up d-md-none side-nav-toggle" title={gettext('Side Nav Menu')} onClick={this.props.onSideNavMenuClick}></span>
          <div className="dir-operation">
            {this.props.isDirentSelected ?
              <MutipleDirOperationToolbar
                repoID={this.props.repoID} 
                path={this.props.path}
                repoEncrypted={this.props.repoEncrypted}
                selectedDirentList={this.props.selectedDirentList}
                onItemsMove={this.props.onItemsMove}
                onItemsCopy={this.props.onItemsCopy}
                onItemsDelete={this.props.onItemsDelete}
              /> :
              <DirOperationToolBar 
                path={this.props.path}
                repoID={this.props.repoID}
                repoName={this.props.repoName}
                repoEncrypted={this.props.repoEncrypted}
                direntList={this.props.direntList}
                showShareBtn={this.props.showShareBtn}
                enableDirPrivateShare={this.props.enableDirPrivateShare}
                userPerm={this.props.userPerm}
                isGroupOwnedRepo={this.props.isGroupOwnedRepo}
                onAddFile={this.props.onAddFile}
                onAddFolder={this.props.onAddFolder}
                onUploadFile={this.props.onUploadFile}
                onUploadFolder={this.props.onUploadFolder}
              />
            }
          </div>
          <ViewModeToolbar currentMode={this.props.currentMode} switchViewMode={this.props.switchViewMode}/>
        </div>
        <CommonToolbar repoID={this.props.repoID} onSearchedClick={this.props.onSearchedClick} searchPlaceholder={gettext('Search files in this library')}/>
      </Fragment>
    );
  }
}

LibContentToolbar.propTypes = propTypes;

export default LibContentToolbar;
