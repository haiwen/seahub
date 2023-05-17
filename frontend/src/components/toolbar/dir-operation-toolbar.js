import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { Dropdown, DropdownToggle, DropdownMenu, DropdownItem } from 'reactstrap';
import { Utils } from '../../utils/utils';
import { enableSeadoc, gettext } from '../../utils/constants';
import ModalPortal from '../modal-portal';
import CreateFolder from '../../components/dialog/create-folder-dialog';
import CreateFile from '../../components/dialog/create-file-dialog';
import ShareDialog from '../../components/dialog/share-dialog';
import ViewModeToolbar from './view-mode-toolbar';

const propTypes = {
  path: PropTypes.string.isRequired,
  repoID: PropTypes.string.isRequired,
  repoName: PropTypes.string.isRequired,
  repoEncrypted: PropTypes.bool.isRequired,
  enableDirPrivateShare: PropTypes.bool.isRequired,
  userPerm: PropTypes.string.isRequired,
  isGroupOwnedRepo: PropTypes.bool.isRequired,
  showShareBtn: PropTypes.bool.isRequired,
  onAddFile: PropTypes.func.isRequired,
  onAddFolder: PropTypes.func.isRequired,
  onUploadFile: PropTypes.func.isRequired,
  onUploadFolder: PropTypes.func.isRequired,
  direntList: PropTypes.array.isRequired,
  currentMode: PropTypes.string.isRequired,
  switchViewMode: PropTypes.func.isRequired,
};

class DirOperationToolbar extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      fileType: '.md',
      isCreateFileDialogShow: false,
      isCreateFolderDialogShow: false,
      isUploadMenuShow: false,
      isCreateMenuShow: false,
      isShareDialogShow: false,
      operationMenuStyle: '',
      isMobileOpMenuOpen: false
    };
  }

  componentDidMount() {
    document.addEventListener('click', this.hideOperationMenu);
  }

  componentWillUnmount() {
    document.removeEventListener('click', this.hideOperationMenu);
  }

  toggleMobileOpMenu = () => {
    this.setState({isMobileOpMenuOpen: !this.state.isMobileOpMenuOpen});
  }

  hideOperationMenu = () => {
    this.setState({
      isUploadMenuShow: false,
      isCreateMenuShow: false,
    });
  }

  toggleOperationMenu = (e) => {
    e.nativeEvent.stopImmediatePropagation();
    let targetRect = e.target.getBoundingClientRect();
    let left = targetRect.left;
    let top  = targetRect.bottom;
    let style = {position: 'fixed', display: 'block', left: left, top: top};
    this.setState({operationMenuStyle: style});
  }

  onUploadClick = (e) => {
    this.toggleOperationMenu(e);
    this.setState({
      isUploadMenuShow: !this.state.isUploadMenuShow,
      isCreateMenuShow: false,
    });
  }

  onUploadFile = (e) => {
    this.setState({isUploadMenuShow: false});
    this.props.onUploadFile(e);
  }

  onUploadFolder = (e) => {
    this.setState({isUploadMenuShow: false});
    this.props.onUploadFolder(e);
  }

  onCreateClick = (e) => {
    this.toggleOperationMenu(e);
    this.setState({
      isCreateMenuShow: !this.state.isCreateMenuShow,
      isUploadMenuShow: false,
    });
  }

  onShareClick = () => {
    this.setState({
      isShareDialogShow: !this.state.isShareDialogShow
    });
  }

  onCreateFolderToggle = () => {
    this.setState({isCreateFolderDialogShow: !this.state.isCreateFolderDialogShow});
  }

  onCreateFileToggle = () => {
    this.setState({
      isCreateFileDialogShow: !this.state.isCreateFileDialogShow,
      fileType: '',
    });
  }

  onCreateMarkdownToggle = () => {
    this.setState({
      isCreateFileDialogShow: !this.state.isCreateFileDialogShow,
      fileType: '.md'
    });
  }

  onCreateExcelToggle = () => {
    this.setState({
      isCreateFileDialogShow: !this.state.isCreateFileDialogShow,
      fileType: '.xlsx'
    });
  }

  onCreatePPTToggle = () => {
    this.setState({
      isCreateFileDialogShow: !this.state.isCreateFileDialogShow,
      fileType: '.pptx'
    });
  }

  onCreateWordToggle = () => {
    this.setState({
      isCreateFileDialogShow: !this.state.isCreateFileDialogShow,
      fileType: '.docx'
    });
  }

  onCreateSeaDocToggle = () => {
    this.setState({
      isCreateFileDialogShow: !this.state.isCreateFileDialogShow,
      fileType: '.sdoc'
    });
  }

  onAddFile = (filePath, isDraft) => {
    this.setState({isCreateFileDialogShow: false});
    this.props.onAddFile(filePath, isDraft);
  }

  onAddFolder = (dirPath) => {
    this.setState({isCreateFolderDialogShow: false});
    this.props.onAddFolder(dirPath);
  }

  checkDuplicatedName = (newName) => {
    let direntList = this.props.direntList;
    let isDuplicated = direntList.some(object => {
      return object.name === newName;
    });
    return isDuplicated;
  }

  render() {
    let { path, repoName, userPerm } = this.props;

    let itemType = path === '/' ? 'library' : 'dir';
    let itemName = path == '/' ? repoName : Utils.getFolderName(path);

    const { isCustomPermission, customPermission } = Utils.getUserPermission(userPerm);
    let canUpload = true;
    let canCreate = true;
    if (isCustomPermission) {
      const { permission } = customPermission;
      canUpload = permission.upload;
      canCreate = permission.create;
    }

    let content = null;
    if (Utils.isDesktop()) {
      let { showShareBtn } = this.props;
      content = (
        <Fragment>
          {canUpload && (
            <Fragment>
              {Utils.isSupportUploadFolder() ?
                <Fragment>
                  <button className="btn btn-secondary operation-item" onClick={this.onUploadClick} aria-haspopup="true" aria-expanded={this.state.isUploadMenuShow} aria-controls="upload-menu">{gettext('Upload')}</button>
                  {this.state.isUploadMenuShow && (
                    <div className="menu dropdown-menu" style={this.state.operationMenuStyle} role="menu" id="upload-menu">
                      <button type="button" className="dropdown-item" onClick={this.onUploadFile} role="menuitem">{gettext('Upload Files')}</button>
                      <button type="button" className="dropdown-item" onClick={this.onUploadFolder} role="menuitem">{gettext('Upload Folder')}</button>
                    </div>
                  )}
                </Fragment>
                :
                <button className="btn btn-secondary operation-item" title={gettext('Upload')} onClick={this.onUploadFile}>{gettext('Upload')}</button>}
            </Fragment>
          )}
          {canCreate &&
          <Fragment>
            <button className="btn btn-secondary operation-item" onClick={this.onCreateClick} aria-haspopup="true" aria-expanded={this.state.isUploadMenuShow} aria-controls="new-menu">{gettext('New')}</button>
            {this.state.isCreateMenuShow && (
              <div className="menu dropdown-menu" style={this.state.operationMenuStyle} role="menu" id="new-menu">
                <button className="dropdown-item" onClick={this.onCreateFolderToggle} role="menuitem">{gettext('New Folder')}</button>
                <button className="dropdown-item" onClick={this.onCreateFileToggle}>{gettext('New File')}</button>
                <div className="dropdown-divider"></div>
                <button className="dropdown-item" onClick={this.onCreateMarkdownToggle} role="menuitem">{gettext('New Markdown File')}</button>
                <button className="dropdown-item" onClick={this.onCreateExcelToggle} role="menuitem">{gettext('New Excel File')}</button>
                <button className="dropdown-item" onClick={this.onCreatePPTToggle} role="menuitem">{gettext('New PowerPoint File')}</button>
                <button className="dropdown-item" onClick={this.onCreateWordToggle} role="menuitem">{gettext('New Word File')}</button>
                {enableSeadoc && <button className="dropdown-item" onClick={this.onCreateSeaDocToggle} role="menuitem">{gettext('New SeaDoc File')}</button>}
              </div>
            )}
          </Fragment>
          }
          {showShareBtn && <button className="btn btn-secondary operation-item" title={gettext('Share')} onClick={this.onShareClick}>{gettext('Share')}</button>}
        </Fragment>
      );
    } else {
      content = (
        <Dropdown isOpen={this.state.isMobileOpMenuOpen} toggle={this.toggleMobileOpMenu}>
          <DropdownToggle tag="span" className="sf2-icon-plus mobile-toolbar-icon" />
          <DropdownMenu>
            {canUpload && (
              <DropdownItem onClick={this.onUploadFile}>{gettext('Upload')}</DropdownItem>
            )}
            {canCreate && (
              <Fragment>
                <DropdownItem onClick={this.onCreateFolderToggle}>{gettext('New Folder')}</DropdownItem>
                <DropdownItem onClick={this.onCreateFileToggle}>{gettext('New File')}</DropdownItem>
              </Fragment>
            )}
          </DropdownMenu>
        </Dropdown>
      );
    }

    return (
      <Fragment>
        {(userPerm === 'rw' || userPerm === 'admin' || isCustomPermission) && (
          <div className="dir-operation">
            {content}
          </div>
        )}
        {Utils.isDesktop() && <ViewModeToolbar currentMode={this.props.currentMode} switchViewMode={this.props.switchViewMode} isCustomPermission={isCustomPermission} />}
        {this.state.isCreateFileDialogShow && (
          <ModalPortal>
            <CreateFile
              parentPath={this.props.path}
              fileType={this.state.fileType}
              onAddFile={this.onAddFile}
              checkDuplicatedName={this.checkDuplicatedName}
              addFileCancel={this.onCreateFileToggle}
            />
          </ModalPortal>
        )}
        {this.state.isCreateFolderDialogShow && (
          <ModalPortal>
            <CreateFolder
              parentPath={this.props.path}
              onAddFolder={this.onAddFolder}
              checkDuplicatedName={this.checkDuplicatedName}
              addFolderCancel={this.onCreateFolderToggle}
            />
          </ModalPortal>
        )}
        {this.state.isShareDialogShow &&
          <ModalPortal>
            <ShareDialog
              itemType={itemType}
              itemName={itemName}
              itemPath={this.props.path}
              repoID={this.props.repoID}
              repoEncrypted={this.props.repoEncrypted}
              enableDirPrivateShare={this.props.enableDirPrivateShare}
              userPerm={this.props.userPerm}
              isGroupOwnedRepo={this.props.isGroupOwnedRepo}
              toggleDialog={this.onShareClick}
            />
          </ModalPortal>
        }
      </Fragment>
    );
  }
}

DirOperationToolbar.propTypes = propTypes;

export default DirOperationToolbar;
