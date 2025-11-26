import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import copy from 'copy-to-clipboard';
import { Dropdown, DropdownToggle, DropdownMenu, DropdownItem } from 'reactstrap';
import { Utils } from '../../utils/utils';
import { seafileAPI } from '../../utils/seafile-api';
import { enableSeadoc, enableWhiteboard, gettext, onlyofficeSupportEditDocxf } from '../../utils/constants';
import toaster from '../toast';
import TipDialog from '../dialog/tip-dialog';
import { EVENT_BUS_TYPE } from '../common/event-bus-type';
import Icon from '../icon';

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

  onUploadSdoc = (e) => {
    this.fileInputRef.current.click();
  };

  uploadSdoc = (e) => {
    // no file selected
    if (!this.fileInputRef.current.files.length) {
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
          newSubOpList.push({ 'text': gettext('New Excalidraw File'), 'onClick': () => this.onCreateFile('.exdraw') });
        }
        newSubOpList.push(
          { 'text': gettext('New Markdown File'), 'onClick': () => this.onCreateFile('.md') },
          { 'text': gettext('New Excel File'), 'onClick': () => this.onCreateFile('.xlsx') },
          { 'text': gettext('New PowerPoint File'), 'onClick': () => this.onCreateFile('.pptx') },
          { 'text': gettext('New Word File'), 'onClick': () => this.onCreateFile('.docx') },
        );
        if (onlyofficeSupportEditDocxf) {
          newSubOpList.push({ 'text': gettext('New Docxf File'), 'onClick': () => this.onCreateFile('.docxf') });
        }
        if (enableWhiteboard) {
          newSubOpList.push({ 'text': gettext('New Whiteboard File'), 'onClick': () => this.onCreateFile('.draw') });
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
              tabIndex="0"
              className="path-item"
              onClick={this.toggleDesktopOpMenu}
              data-toggle="dropdown"
              aria-label={gettext('More operations')}
              aria-expanded={this.state.isDesktopMenuOpen}
            >
              <Icon symbol="new" />
              <Icon symbol="down" className="path-item-dropdown-toggle" />
            </DropdownToggle>
            <DropdownMenu onMouseMove={this.onDropDownMouseMove} className='position-fixed'>
              {opList.map((item, index) => {
                if (item == 'Divider') {
                  return <DropdownItem key={index} divider />;
                } else if (item.subOpList) {
                  return (
                    <Dropdown
                      key={index}
                      role="menuitem"
                      tabIndex="0"
                      direction="right"
                      className="w-100"
                      isOpen={this.state.isSubMenuShown && this.state.currentItem == item.text}
                      toggle={this.toggleSubMenu}
                      onMouseMove={(e) => {e.stopPropagation();}}
                    >
                      <DropdownToggle
                        tag='span'
                        role="button"
                        tabIndex="0"
                        className="dropdown-item font-weight-normal rounded-0 d-flex align-items-center"
                        onClick={this.toggleSubMenu}
                        aria-label={item.text}
                        data-toggle="dropdown"
                        onMouseEnter={this.toggleSubMenuShown.bind(this, item)}
                      >
                        <Icon symbol={item.icon} className="mr-2 dropdown-item-icon" />
                        <span className="mr-auto">{item.text}</span>
                        <Icon symbol="right_arrow" />
                      </DropdownToggle>
                      <DropdownMenu flip={false} modifiers={[{ name: 'preventOverflow', options: { boundary: document.body } }]}>
                        {item.subOpList.map((item, index) => {
                          if (item == 'Divider') {
                            return <DropdownItem key={index} divider />;
                          } else {
                            return (<DropdownItem key={index} onClick={item.onClick}>{item.text}</DropdownItem>);
                          }
                        })}
                      </DropdownMenu>
                    </Dropdown>
                  );
                } else {
                  return (
                    <DropdownItem key={index} className="d-flex align-items-center" onClick={item.onClick} onKeyDown={this.onMenuItemKeyDown.bind(this, item)}>
                      <Icon symbol={item.icon} className="mr-2 dropdown-item-icon" />
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
            <Icon symbol="new" />
            <Icon symbol="down" className="path-item-dropdown-toggle" />
          </DropdownToggle>
          <DropdownMenu className='position-fixed'>
            {canUpload && (
              <DropdownItem onClick={this.onUploadFile}>{gettext('Upload')}</DropdownItem>
            )}
            {canCreate && (
              <Fragment>
                <DropdownItem onClick={this.onCreateFolder}>{gettext('New Folder')}</DropdownItem>
                <DropdownItem onClick={() => this.onCreateFile('')}>{gettext('New File')}</DropdownItem>
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
        {this.state.isImportingSdoc && <TipDialog/>}
        <div>
          <input className="d-none" type="file" onChange={this.uploadSdoc} ref={this.fileInputRef} accept=".sdoczip"/>
        </div>
      </Fragment>
    );
  }
}

DirOperationToolbar.propTypes = propTypes;

export default DirOperationToolbar;
