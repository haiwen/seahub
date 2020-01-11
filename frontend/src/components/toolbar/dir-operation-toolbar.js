import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { Dropdown, DropdownToggle, DropdownMenu, DropdownItem } from 'reactstrap';
import { Utils } from '../../utils/utils';
import { gettext } from '../../utils/constants';
import ModalPortal from '../modal-portal';
import CreateFolder from '../../components/dialog/create-folder-dialog';
import CreateFile from '../../components/dialog/create-file-dialog';
import ShareDialog from '../../components/dialog/share-dialog';

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
      isUploadMenuShow: true,
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
      isCreateMenuShow: true,
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
    
    if (userPerm !== 'rw' && userPerm !== 'admin') {
      return '';
    }

    let itemType = path === '/' ? 'library' : 'dir';
    let itemName = path == '/' ? repoName : Utils.getFolderName(path);

    const content = Utils.isDesktop() ? (
      <Fragment>
        {Utils.isSupportUploadFolder() ?
          <button className="btn btn-secondary operation-item" title={gettext('Upload')} onClick={this.onUploadClick}>{gettext('Upload')}</button> :
          <button className="btn btn-secondary operation-item" title={gettext('Upload')} onClick={this.onUploadFile}>{gettext('Upload')}</button>}
        <button className="btn btn-secondary operation-item" title={gettext('New')} onClick={this.onCreateClick}>{gettext('New')}</button>
        {this.props.showShareBtn &&
          <button className="btn btn-secondary operation-item" title={gettext('Share')} onClick={this.onShareClick}>{gettext('Share')}</button>}
      </Fragment>
    ) : (
      <Dropdown isOpen={this.state.isMobileOpMenuOpen} toggle={this.toggleMobileOpMenu}>
        <DropdownToggle
          tag="span"
          className="sf2-icon-plus mobile-toolbar-icon"
        />
        <DropdownMenu>
          <DropdownItem onClick={this.onUploadFile}>{gettext('Upload')}</DropdownItem>
          <DropdownItem onClick={this.onCreateFolderToggle}>{gettext('New Folder')}</DropdownItem>
          <DropdownItem onClick={this.onCreateFileToggle}>{gettext('New File')}</DropdownItem>
        </DropdownMenu>
      </Dropdown>
    );

    return (
      <Fragment>
        <div className="operation">
          {content}
        </div>
        {this.state.isUploadMenuShow && (
          <ul className="menu dropdown-menu" style={this.state.operationMenuStyle}>
            <li className="dropdown-item" onClick={this.onUploadFile}>{gettext('Upload Files')}</li>
            <li className="dropdown-item" onClick={this.onUploadFolder}>{gettext('Upload Folder')}</li>
          </ul>
        )}
        {this.state.isCreateMenuShow && (
          <ul className="menu dropdown-menu" style={this.state.operationMenuStyle}>
            <li className="dropdown-item" onClick={this.onCreateFolderToggle}>{gettext('New Folder')}</li>
            <li className="dropdown-item" onClick={this.onCreateFileToggle}>{gettext('New File')}</li>
            <li className="dropdown-divider"></li>
            <li className="dropdown-item" onClick={this.onCreateMarkdownToggle}>{gettext('New Markdown File')}</li>
            <li className="dropdown-item" onClick={this.onCreateExcelToggle}>{gettext('New Excel File')}</li>
            <li className="dropdown-item" onClick={this.onCreatePPTToggle}>{gettext('New PowerPoint File')}</li>
            <li className="dropdown-item" onClick={this.onCreateWordToggle}>{gettext('New Word File')}</li>
          </ul>
        )}
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
