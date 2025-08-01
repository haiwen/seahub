import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import copy from 'copy-to-clipboard';
import { Dropdown, DropdownToggle, DropdownMenu, DropdownItem } from 'reactstrap';
import { Utils } from '../../utils/utils';
import { seafileAPI } from '../../utils/seafile-api';
import { enableExcalidraw, enableSeadoc, enableWhiteboard, gettext } from '../../utils/constants';
import toaster from '../toast';
import TipDialog from '../dialog/tip-dailog';
import { EVENT_BUS_TYPE } from '../common/event-bus-type';

const propTypes = {
  path: PropTypes.string.isRequired,
  repoID: PropTypes.string.isRequired,
  repoName: PropTypes.string.isRequired,
  repoEncrypted: PropTypes.bool.isRequired,
  enableDirPrivateShare: PropTypes.bool.isRequired,
  userPerm: PropTypes.string.isRequired,
  isGroupOwnedRepo: PropTypes.bool.isRequired,
  showShareBtn: PropTypes.bool.isRequired,
  onUploadFile: PropTypes.func.isRequired,
  onUploadFolder: PropTypes.func.isRequired,
  direntList: PropTypes.array.isRequired,
  children: PropTypes.object,
  eventBus: PropTypes.object,
  loadDirentList: PropTypes.func
};

class DirOperationToolbar extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      fileType: '.md',
      operationMenuStyle: '',
      isDesktopMenuOpen: false,
      isSubMenuShown: false,
      isMobileOpMenuOpen: false,
      isImportingSdoc: false,
    };
    this.fileInputRef = React.createRef();
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
    const { eventBus, path, repoName, userPerm } = this.props;
    let type = path === '/' ? 'library' : 'dir';
    let name = path == '/' ? repoName : Utils.getFolderName(path);

    eventBus.dispatch(EVENT_BUS_TYPE.SHARE_FILE, path, { type, name, permission: userPerm });
  };

  copyPath = () => {
    const { path } = this.props;
    copy(path);
    const message = gettext('The path has been copied to the clipboard');
    toaster.success((message), {
      duration: 2
    });
  };

  onCreateFolder = () => {
    const { eventBus, path, direntList } = this.props;
    eventBus.dispatch(EVENT_BUS_TYPE.CREATE_FOLDER, path, direntList);
  };

  onCreateFile = (fileType = '') => {
    const { eventBus, path, direntList } = this.props;
    eventBus.dispatch(EVENT_BUS_TYPE.CREATE_FILE, path, direntList, fileType);
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

  onUploadSdoc = (e) => {
    this.fileInputRef.current.click();
  };

  uploadSdoc = (e) => {
    // no file selected
    if (!this.fileInputRef.current.files.length) {
      return;
    }
    // check file extension
    let fileName = this.fileInputRef.current.files[0].name;
    if (fileName.substr(fileName.lastIndexOf('.') + 1) != 'sdoczip') {
      toaster.warning(gettext('Please choose a .sdoczip file.'), { hasCloseButton: true, duration: null });
      return;
    }
    this.setState({ isImportingSdoc: true });
    const file = this.fileInputRef.current.files[0];
    let { repoID, path } = this.props;
    seafileAPI.importSdoc(file, repoID, path).then((res) => {
      this.props.loadDirentList(path);

    }).catch((error) => {
      let errMsg = Utils.getErrorMsg(error);
      toaster.danger(errMsg);
    }).finally(() => {
      this.fileInputRef.current.value = '';
      setTimeout(() => {
        this.setState({ isImportingSdoc: false });
      }, 500);
    });
  };

  render() {
    const { userPerm } = this.props;
    const { isCustomPermission, customPermission } = Utils.getUserPermission(userPerm);
    const isShowDropdownMenu = (userPerm === 'rw' || userPerm === 'admin' || userPerm === 'cloud-edit' || isCustomPermission);
    if (!isShowDropdownMenu) {
      return (
        <div className="dir-operation dir-operation-no-dropdown">
          {this.props.children}
        </div>
      );
    }

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
          { 'text': gettext('New Folder'), 'onClick': this.onCreateFolder },
          { 'text': gettext('New File'), 'onClick': () => this.onCreateFile('') },
          'Divider',
        ];
        if (enableSeadoc && !repoEncrypted) {
          newSubOpList.push({ 'text': gettext('New SeaDoc File'), 'onClick': () => this.onCreateFile('.sdoc') });
        }
        newSubOpList.push(
          { 'text': gettext('New Markdown File'), 'onClick': () => this.onCreateFile('.md') },
          { 'text': gettext('New Excel File'), 'onClick': () => this.onCreateFile('.xlsx') },
          { 'text': gettext('New PowerPoint File'), 'onClick': () => this.onCreateFile('.pptx') },
          { 'text': gettext('New Word File'), 'onClick': () => this.onCreateFile('.docx') },
        );
        if (enableWhiteboard) {
          newSubOpList.push({ 'text': gettext('New Whiteboard File'), 'onClick': () => this.onCreateFile('.draw') });
        }
        if (enableExcalidraw) {
          newSubOpList.push({ 'text': gettext('New Excalidraw File'), 'onClick': () => this.onCreateFile('.exdraw') });
        }
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

      opList.push({
        'icon': 'copy1',
        'text': gettext('Copy path'),
        'onClick': this.copyPath
      });

      if (enableSeadoc && !repoEncrypted) {
        opList.push('Divider', {
          'icon': 'import-sdoc',
          'text': gettext('Import sdoc'),
          'onClick': this.onUploadSdoc
        });
      }

      content = (
        <Fragment>
          <Dropdown isOpen={this.state.isDesktopMenuOpen} toggle={this.toggleDesktopOpMenu}>
            <DropdownToggle
              tag="span"
              role="button"
              className="path-item"
              onClick={this.toggleDesktopOpMenu}
              onKeyDown={this.onDropdownToggleKeyDown}
              data-toggle="dropdown"
            >
              <i className="sf3-font-new sf3-font"></i>
              <i className="sf3-font-down sf3-font path-item-dropdown-toggle"></i>
            </DropdownToggle>
            <DropdownMenu onMouseMove={this.onDropDownMouseMove} className='position-fixed'>
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
                        tag='span'
                        className="dropdown-item font-weight-normal rounded-0 d-flex align-items-center"
                        onMouseEnter={this.toggleSubMenuShown.bind(this, item)}
                      >
                        <i className={`sf3-font-${item.icon} sf3-font mr-2 dropdown-item-icon`}></i>
                        <span className="mr-auto">{item.text}</span>
                        <i className="sf3-font-down sf3-font rotate-270"></i>
                      </DropdownToggle>
                      <DropdownMenu flip={false} modifiers={[{ name: 'preventOverflow', options: { boundary: document.body } }]}>
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
            tag="span"
            role="button"
            className="path-item"
          >
            <i className="sf3-font-new sf3-font"></i>
            <i className="sf3-font-down sf3-font path-item-dropdown-toggle"></i>
          </DropdownToggle>
          <DropdownMenu className='position-fixed'>
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
        {isShowDropdownMenu && (
          <div className="dir-operation">
            {this.props.children}
            {content}
          </div>
        )}
        {this.state.isImportingSdoc && (
          <TipDialog modalTitle={gettext('Import sdoc')} modalTip={gettext('Importing sdoc, please wait...')}/>
        )}
        <div>
          <input className="d-none" type="file" onChange={this.uploadSdoc} ref={this.fileInputRef} />
        </div>
      </Fragment>
    );
  }
}

DirOperationToolbar.propTypes = propTypes;

export default DirOperationToolbar;
