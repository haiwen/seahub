import React from 'react';
import PropTypes from 'prop-types';
import copy from 'copy-to-clipboard';
import { Utils } from '../../utils/utils';
import { seafileAPI } from '../../utils/seafile-api';
import { enableSeadoc, enableWhiteboard, gettext, onlyofficeSupportEditDocxf } from '../../utils/constants';
import toaster from '../toast';
import TipDialog from '../dialog/tip-dialog';
import { EVENT_BUS_TYPE } from '../common/event-bus-type';
import Icon from '../icon';
import CustomDropdown from '../dropdown';

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
      isImportingSdoc: false,
    };
    this.fileInputRef = React.createRef();
  }

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
            key: 'upload-files',
            label: gettext('Upload Files'),
            icon_dom: <Icon symbol="upload-files" className="dropdown-item-icon" />,
            onClick: this.onUploadFile
          }, {
            key: 'upload-folder',
            label: gettext('Upload Folder'),
            icon_dom: <Icon symbol="upload-folder" className="dropdown-item-icon" />,
            onClick: this.onUploadFolder
          });
        } else {
          opList.push({
            key: 'upload',
            label: gettext('Upload'),
            icon_dom: <Icon symbol="upload-files" className="dropdown-item-icon" />,
            onClick: this.onUploadFile
          });
        }
      }

      if (canCreate) {
        let newSubOpList = [
          { key: 'new-folder', label: gettext('New Folder'), onClick: this.onCreateFolder },
          { key: 'new-file', label: gettext('New File'), onClick: () => this.onCreateFile('') },
          'Divider',
        ];
        if (enableSeadoc && !repoEncrypted) {
          newSubOpList.push({ key: 'new-seadoc-file', label: gettext('New SeaDoc File'), onClick: () => this.onCreateFile('.sdoc') });
          newSubOpList.push({ key: 'new-excalidraw-file', label: gettext('New Excalidraw File'), onClick: () => this.onCreateFile('.exdraw') });
        }
        newSubOpList.push(
          { key: 'new-markdown-file', label: gettext('New Markdown File'), onClick: () => this.onCreateFile('.md') },
          { key: 'new-excel-file', label: gettext('New Excel File'), onClick: () => this.onCreateFile('.xlsx') },
          { key: 'new-powerpoint-file', label: gettext('New PowerPoint File'), onClick: () => this.onCreateFile('.pptx') },
          { key: 'new-word-file', label: gettext('New Word File'), onClick: () => this.onCreateFile('.docx') },
        );
        if (onlyofficeSupportEditDocxf) {
          newSubOpList.push({ key: 'new-docxf-file', label: gettext('New Docxf File'), onClick: () => this.onCreateFile('.docxf') });
        }
        if (enableWhiteboard) {
          newSubOpList.push({ key: 'new-whiteboard-file', label: gettext('New Whiteboard File'), onClick: () => this.onCreateFile('.draw') });
        }
        opList.push({
          key: 'new',
          label: gettext('New'),
          icon_dom: <Icon symbol="new" className="dropdown-item-icon" />,
          children: newSubOpList
        });
      }

      if (showShareBtn) {
        opList.push({
          key: 'share',
          label: gettext('Share'),
          icon_dom: <Icon symbol="share" className="dropdown-item-icon" />,
          onClick: this.onShareClick
        });
      }

      opList.push({
        key: 'copy-path',
        label: gettext('Copy path'),
        icon_dom: <Icon symbol="copy" className="dropdown-item-icon" />,
        onClick: this.copyPath
      });

      if (enableSeadoc && !repoEncrypted) {
        opList.push('Divider', {
          key: 'import-sdoc',
          label: gettext('Import sdoc'),
          icon_dom: <Icon symbol="import-sdoc" className="dropdown-item-icon" />,
          onClick: this.onUploadSdoc
        });
      }

      content = (
        <>
          <CustomDropdown
            items={opList}
            trigger={(
              <>
                <Icon symbol="new" />
                <Icon symbol="down" className="path-item-dropdown-toggle" />
              </>
            )}
            triggerClassName="path-dropdown-item"
            menuClassName="position-fixed"
            menuPortal={false}
          />
        </>
      );
    } else {
      const mobileItems = [];
      if (canUpload) {
        mobileItems.push({ key: 'upload', label: gettext('Upload'), onClick: this.onUploadFile });
      }
      if (canCreate) {
        mobileItems.push(
          { key: 'new-folder', label: gettext('New Folder'), onClick: this.onCreateFolder },
          { key: 'new-file', label: gettext('New File'), onClick: () => this.onCreateFile('') }
        );
      }

      content = (
        <CustomDropdown
          items={mobileItems}
          trigger={(
            <>
              <Icon symbol="new" />
              <Icon symbol="down" className="path-item-dropdown-toggle" />
            </>
          )}
          triggerClassName="path-item"
          menuClassName="position-fixed"
          menuPortal={false}
        />
      );
    }

    return (
      <>
        {isShowDropdownMenu && (
          <div className="dir-operation">
            {this.props.children}
            {content}
          </div>
        )}
        {this.state.isImportingSdoc && <TipDialog />}
        <div>
          <input className="d-none" type="file" onChange={this.uploadSdoc} ref={this.fileInputRef} accept=".sdoczip" />
        </div>
      </>
    );
  }
}

DirOperationToolbar.propTypes = propTypes;

export default DirOperationToolbar;
