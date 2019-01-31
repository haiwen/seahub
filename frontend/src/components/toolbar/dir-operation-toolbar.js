import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { Utils } from '../../utils/utils';
import { gettext, siteRoot } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import ModalPortal from '../modal-portal';
import CreateFolder from '../../components/dialog/create-folder-dialog';
import CreateFile from '../../components/dialog/create-file-dialog';
import ShareDialog from '../../components/dialog/share-dialog';

const propTypes = {
  isViewFile: PropTypes.bool,   // just for view file,
  permission: PropTypes.string, //just for view file， and premission is file permission
  path: PropTypes.string.isRequired,
  repoID: PropTypes.string.isRequired,
  showShareBtn: PropTypes.bool.isRequired,
  onAddFile: PropTypes.func.isRequired,
  onAddFolder: PropTypes.func.isRequired,
  onUploadFile: PropTypes.func.isRequired,
  onUploadFolder: PropTypes.func.isRequired,
  isDraft: PropTypes.bool,
  hasDraft: PropTypes.bool,
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
    };
  }

  componentDidMount() {
    document.addEventListener('click', this.hideOperationMenu);
  }

  componentWillUnmount() {
    document.removeEventListener('click', this.hideOperationMenu);
  }

  hideOperationMenu = () => {
    this.setState({
      isUploadMenuShow: false,
      isCreateMenuShow: false,
    });
  }

  toggleOperationMenu = (e) => {
    e.nativeEvent.stopImmediatePropagation();
    let targetRect = e.target.getClientRects()[0];
    let left = targetRect.x;
    let top  = targetRect.y + targetRect.height;
    let style = {position: 'fixed', display: 'block', left: left, top: top};
    this.setState({operationMenuStyle: style});
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

  onShareClick = (e) => {
    e.nativeEvent.stopImmediatePropagation(); //for document event
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

  onViewReview = () => {
    this.props.goReviewPage();
  }

  onViewDraft = () => {
    this.props.goDraftPage();
  }

  checkDuplicatedName = (newName) => {
    let direntList = this.props.direntList;
    let isDuplicated = direntList.some(object => {
      return object.name === newName;
    });
    return isDuplicated;
  }

  render() {
    let { path, isViewFile, repoName } = this.props;
    let itemType = isViewFile ? 'file' : 'dir';
    let itemName = isViewFile ? Utils.getFileName(path) : (path == '/' ? repoName : Utils.getFolderName(path));
    return (
      <Fragment>
        <div className="operation">
          {(this.props.isViewFile && this.props.permission === 'rw' && !this.props.hasDraft ) && (
            <Fragment>
              <button className="btn btn-secondary operation-item" title={gettext('Edit File')} onClick={this.onEditClick}>{gettext('Edit')}</button>
            </Fragment>
          )}

          {(this.props.isViewFile && !this.props.isDraft && !this.props.hasDraft) && (
            <button className="btn btn-secondary operation-item" title={gettext('New Draft')} onClick={this.onNewDraft}>{gettext('New Draft')}</button>
          )}

          {!this.props.isViewFile && (
            <Fragment>
              {Utils.isSupportUploadFolder() ?
                <button className="btn btn-secondary operation-item" title={gettext('Upload')} onClick={this.onUploadClick}>{gettext('Upload')}</button> :
                <button className="btn btn-secondary operation-item" title={gettext('Upload')} onClick={this.uploadFile}>{gettext('Upload')}</button>
              }
              <button className="btn btn-secondary operation-item" title={gettext('New')} onClick={this.onCreateClick}>{gettext('New')}</button>
            </Fragment>
          )}
          {this.props.showShareBtn &&
          <button className="btn btn-secondary operation-item" title={gettext('Share')} onClick={this.onShareClick}>{gettext('Share')}</button>
          }
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
              isAdmin={this.props.isAdmin}
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
