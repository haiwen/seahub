import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { Button } from 'reactstrap';
import { Utils } from '../../utils/utils';
import { seafileAPI } from '../../utils/seafile-api';
import { enableSeadoc, enableWhiteboard, gettext, onlyofficeSupportEditDocxf } from '../../utils/constants';
import toaster from '../toast';
import TipDialog from '../dialog/tip-dialog';
import { EVENT_BUS_TYPE } from '../common/event-bus-type';
import Icon from '../icon';
import {
  METADATA_MODE,
  TAGS_MODE,
  HISTORY_MODE,
  TRASH_MODE
} from '../../components/dir-view-mode/constants';
import CustomDropdown from '../dropdown';

const propTypes = {
  currentMode: PropTypes.string,
  path: PropTypes.string,
  repoID: PropTypes.string.isRequired,
  repoEncrypted: PropTypes.bool.isRequired,
  userPerm: PropTypes.string.isRequired,
  onUploadFile: PropTypes.func.isRequired,
  onUploadFolder: PropTypes.func.isRequired,
  direntList: PropTypes.array,
  eventBus: PropTypes.object,
  loadDirentList: PropTypes.func
};

class DirNew extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
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

  onCreateFolder = () => {
    const { eventBus, path, direntList } = this.props;
    this.setState({ isDesktopMenuOpen: false });
    eventBus.dispatch(EVENT_BUS_TYPE.CREATE_FOLDER, path, direntList);
  };

  onCreateFile = (fileType = '') => {
    const { eventBus, path, direntList } = this.props;
    this.setState({ isDesktopMenuOpen: false });
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
    const { userPerm, currentMode } = this.props;
    const { isCustomPermission, customPermission } = Utils.getUserPermission(userPerm);
    const isBtnShown = (userPerm === 'rw' || userPerm === 'admin' || userPerm === 'cloud-edit' || isCustomPermission);
    if (!isBtnShown) {
      return null;
    }

    const newBtnClassName = 'dir-new-btn mt-3 mx-5 flex-fill d-flex align-items-center justify-content-center btn btn-secondary';

    if ([METADATA_MODE, TAGS_MODE, HISTORY_MODE, TRASH_MODE].includes(currentMode)) {
      return (
        <div className='d-flex'>
          <Button
            className={newBtnClassName}
            disabled={true}
          >
            <Icon symbol="new" className="mr-2" />
            {gettext('New')}
          </Button>
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
      const { repoEncrypted } = this.props;
      let opList = [];

      if (canCreate) {
        let newSubOpList = [];
        newSubOpList.push({ key: 'new-file', label: gettext('New Text File'), onClick: () => this.onCreateFile('') });
        newSubOpList.push('Divider');

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
          key: 'new-folder',
          label: gettext('New Folder'),
          icon_dom: <Icon symbol="new-folder" className="dropdown-item-icon" />,
          onClick: this.onCreateFolder
        },
        {
          key: 'new-file',
          label: gettext('New File'),
          icon_dom: <Icon symbol="new-file" className="dropdown-item-icon" />,
          'subOpList': newSubOpList
        });
      }

      if (canUpload) {
        if (opList.length > 0) {
          opList.push('Divider');
        }
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
            key: 'upload-files',
            label: gettext('Upload'),
            icon_dom: <Icon symbol="upload-files" className="dropdown-item-icon" />,
            onClick: this.onUploadFile
          });
        }
      }

      if (enableSeadoc && !repoEncrypted) {
        if (opList.length > 0) {
          opList.push('Divider');
        }
        opList.push({
          key: 'import-sdoc',
          label: gettext('Import sdoc'),
          icon_dom: <Icon symbol="import-sdoc" className="dropdown-item-icon" />,
          onClick: this.onUploadSdoc
        });
      }

      content = (
        <CustomDropdown
          className='d-flex'
          items={opList}
          toggleProps={{ 'tag': 'button', 'type': 'button', 'role': '' }}
          trigger={(
            <>
              <Icon symbol="new" className="mr-2" />
              {gettext('New')}
            </>
          )}
          triggerClassName={newBtnClassName}
          menuClassName="position-fixed"
        />
      );
    } else {
      const opListForMobile = [];
      if (canCreate) {
        opListForMobile.push(
          { key: 'new-folder', label: gettext('New Folder'), onClick: this.onCreateFolder },
          { key: 'new-file', label: gettext('New File'), onClick: () => this.onCreateFile('') }
        );
      }
      if (canUpload) {
        opListForMobile.push({ key: 'upload-files', label: gettext('Upload'), onClick: this.onUploadFile });
      }

      content = (
        <CustomDropdown
          className='d-flex'
          items={opListForMobile}
          toggleProps={{ 'tag': 'button', 'type': 'button', 'role': '' }}
          trigger={(
            <>
              <Icon symbol="new" className="mr-2" />
              {gettext('New')}
            </>
          )}
          triggerClassName={newBtnClassName}
          menuClassName="position-fixed"
        />
      );
    }

    return (
      <Fragment>
        {isBtnShown && content}
        {this.state.isImportingSdoc && <TipDialog/>}
        <div>
          <input className="d-none" type="file" onChange={this.uploadSdoc} ref={this.fileInputRef} accept=".sdoczip"/>
        </div>
      </Fragment>
    );
  }
}

DirNew.propTypes = propTypes;

export default DirNew;
