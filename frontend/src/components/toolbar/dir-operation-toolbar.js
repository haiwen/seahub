import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { Dropdown, DropdownToggle, DropdownMenu, DropdownItem } from 'reactstrap';
import { Utils } from '../../utils/utils';
import { enableSeadoc, gettext } from '../../utils/constants';
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
  children: PropTypes.object
};

class DirOperationToolbar extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      fileType: '.md',
      isCreateFileDialogShow: false,
      isCreateFolderDialogShow: false,
      isShareDialogShow: false,
      operationMenuStyle: '',
      isDesktopMenuOpen: false,
      isSubMenuShown: false,
      isMobileOpMenuOpen: false
    };
  }

  toggleDesktopOpMenu = () => {
    this.setState({ isDesktopMenuOpen: !this.state.isDesktopMenuOpen });
  };

  toggleMobileOpMenu = () => {
    this.setState({ isMobileOpMenuOpen: !this.state.isMobileOpMenuOpen });
  };

  onUploadFile = (e) => {
    this.props.onUploadFile(e);
  };

  onUploadFolder = (e) => {
    this.props.onUploadFolder(e);
  };

  onShareClick = () => {
    this.setState({
      isShareDialogShow: !this.state.isShareDialogShow
    });
  };

  onCreateFolderToggle = () => {
    this.setState({ isCreateFolderDialogShow: !this.state.isCreateFolderDialogShow });
  };

  onCreateFileToggle = () => {
    this.setState({
      isCreateFileDialogShow: !this.state.isCreateFileDialogShow,
      fileType: ''
    });
  };

  onCreateMarkdownToggle = () => {
    this.setState({
      isCreateFileDialogShow: !this.state.isCreateFileDialogShow,
      fileType: '.md'
    });
  };

  onCreateExcelToggle = () => {
    this.setState({
      isCreateFileDialogShow: !this.state.isCreateFileDialogShow,
      fileType: '.xlsx'
    });
  };

  onCreatePPTToggle = () => {
    this.setState({
      isCreateFileDialogShow: !this.state.isCreateFileDialogShow,
      fileType: '.pptx'
    });
  };

  onCreateWordToggle = () => {
    this.setState({
      isCreateFileDialogShow: !this.state.isCreateFileDialogShow,
      fileType: '.docx'
    });
  };

  onCreateSeaDocToggle = () => {
    this.setState({
      isCreateFileDialogShow: !this.state.isCreateFileDialogShow,
      fileType: '.sdoc'
    });
  };

  onAddFolder = (dirPath) => {
    this.setState({ isCreateFolderDialogShow: false });
    this.props.onAddFolder(dirPath);
  };

  checkDuplicatedName = (newName) => {
    let direntList = this.props.direntList;
    let isDuplicated = direntList.some(object => {
      return object.name === newName;
    });
    return isDuplicated;
  };

  onDropdownToggleKeyDown = (e) => {
    if (e.key == 'Enter' || e.key == 'Space') {
      this.toggleDesktopOpMenu();
    }
  };

  onDropDownMouseMove = (e) => {
    if (this.state.isSubMenuShown && e.target && e.target.className === 'dropdown-item') {
      this.setState({
        isSubMenuShown: false
      });
    }
  };

  toggleSubMenu = (e) => {
    e.stopPropagation();
    this.setState({
      isSubMenuShown: !this.state.isSubMenuShown
    });
  };

  toggleSubMenuShown = (item) => {
    this.setState({
      isSubMenuShown: true,
      currentItem: item.text
    });
  };

  onMenuItemKeyDown = (item, e) => {
    if (e.key == 'Enter' || e.key == 'Space') {
      item.onClick();
    }
  };

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
      const { showShareBtn, repoEncrypted } = this.props;
      let opList = [];
      if (canUpload) {
        if (Utils.isSupportUploadFolder()) {
          opList.push({
            'icon': 'upload-files',
            'text': gettext('Upload Files'),
            'onClick': this.onUploadFile
          }, {
            'icon': 'upload-files',
            'text': gettext('Upload Folder'),
            'onClick': this.onUploadFolder
          });
        } else {
          opList.push({
            'icon': 'upload-files',
            'text': gettext('Upload'),
            'onClick': this.onUploadFile
          });
        }
      }

      if (canCreate) {
        let newSubOpList = [
          { 'text': gettext('New Folder'), 'onClick': this.onCreateFolderToggle },
          { 'text': gettext('New File'), 'onClick': this.onCreateFileToggle },
          'Divider',
        ];
        if (enableSeadoc && !repoEncrypted) {
          newSubOpList.push({ 'text': gettext('New SeaDoc File'), 'onClick': this.onCreateSeaDocToggle });
        }
        newSubOpList.push(
          { 'text': gettext('New Markdown File'), 'onClick': this.onCreateMarkdownToggle },
          { 'text': gettext('New Excel File'), 'onClick': this.onCreateExcelToggle },
          { 'text': gettext('New PowerPoint File'), 'onClick': this.onCreatePPTToggle },
          { 'text': gettext('New Word File'), 'onClick': this.onCreateWordToggle }
        );
        opList.push({
          'icon': 'new',
          'text': gettext('New'),
          'subOpList': newSubOpList
        });
      }

      if (showShareBtn) {
        opList.push({
          'icon': 'share',
          'text': gettext('Share'),
          'onClick': this.onShareClick
        });
      }

      content = (
        <Fragment>
          <Dropdown isOpen={this.state.isDesktopMenuOpen} toggle={this.toggleDesktopOpMenu}>
            <DropdownToggle
              tag="div"
              role="button"
              className="path-item"
              onClick={this.toggleDesktopOpMenu}
              onKeyDown={this.onDropdownToggleKeyDown}
              data-toggle="dropdown"
            >
              {this.props.children}
              <i className="sf3-font-down sf3-font ml-1 path-item-dropdown-toggle"></i>
            </DropdownToggle>
            <DropdownMenu onMouseMove={this.onDropDownMouseMove} positionFixed={true}>
              {opList.map((item, index) => {
                if (item == 'Divider') {
                  return <DropdownItem key={index} divider />;
                } else if (item.subOpList) {
                  return (
                    <Dropdown
                      key={index}
                      direction="right"
                      className="w-100"
                      isOpen={this.state.isSubMenuShown && this.state.currentItem == item.text}
                      toggle={this.toggleSubMenu}
                      onMouseMove={(e) => {e.stopPropagation();}}
                    >
                      <DropdownToggle
                        tag='div'
                        className="dropdown-item font-weight-normal rounded-0 d-flex align-items-center"
                        onMouseEnter={this.toggleSubMenuShown.bind(this, item)}
                      >
                        <i className={`sf3-font-${item.icon} sf3-font mr-2 dropdown-item-icon`}></i>
                        <span className="mr-auto">{item.text}</span>
                        <i className="sf3-font-down sf3-font rotate-270"></i>
                      </DropdownToggle>
                      <DropdownMenu>
                        {item.subOpList.map((item, index) => {
                          if (item == 'Divider') {
                            return <DropdownItem key={index} divider />;
                          } else {
                            return (<DropdownItem key={index} onClick={item.onClick} onKeyDown={this.onMenuItemKeyDown.bind(this, item)}>{item.text}</DropdownItem>);
                          }
                        })}
                      </DropdownMenu>
                    </Dropdown>
                  );
                } else {
                  return (
                    <DropdownItem key={index} onClick={item.onClick} onKeyDown={this.onMenuItemKeyDown.bind(this, item)}>
                      <i className={`sf3-font-${item.icon} sf3-font mr-2 dropdown-item-icon`}></i>
                      {item.text}
                    </DropdownItem>
                  );
                }
              })}
            </DropdownMenu>
          </Dropdown>
        </Fragment>
      );
    } else {
      content = (
        <Dropdown isOpen={this.state.isMobileOpMenuOpen} toggle={this.toggleMobileOpMenu}>
          <DropdownToggle
            tag="div"
            role="button"
            className="path-item"
          >
            {this.props.children}
            <i className="sf3-font-down sf3-font ml-1 path-item-dropdown-toggle"></i>
          </DropdownToggle>
          <DropdownMenu positionFixed={true}>
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
        {(userPerm === 'rw' || userPerm === 'admin' || userPerm === 'cloud-edit' || isCustomPermission) && (
          <div className="dir-operation">
            {content}
          </div>
        )}
        {this.state.isCreateFileDialogShow && (
          <ModalPortal>
            <CreateFile
              parentPath={this.props.path}
              fileType={this.state.fileType}
              onAddFile={this.props.onAddFile}
              checkDuplicatedName={this.checkDuplicatedName}
              toggleDialog={this.onCreateFileToggle}
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
