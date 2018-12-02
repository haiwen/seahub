import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { Utils } from '../../utils/utils';
import { gettext, siteRoot } from '../../utils/constants';
import ModalPortal from '../modal-portal';
import CreateFolder from '../../components/dialog/create-folder-dialog';
import CreateFile from '../../components/dialog/create-file-dialog';
import ShareDialog from '../../components/dialog/share-dialog';

const propTypes = {
  isViewFile: PropTypes.bool,   // just for view file,
  permission: PropTypes.string, //just for view file， and premission is file permission
  path: PropTypes.string.isRequired,
  repoID: PropTypes.string.isRequired,
  onAddFile: PropTypes.func.isRequired,
  onAddFolder: PropTypes.func.isRequired,
  onUploadFile: PropTypes.func.isRequired,
  onUploadFolder: PropTypes.func.isRequired,
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
    window.location.href= siteRoot + 'lib/' + repoID + '/file' + path + '?mode=edit';
  }

  onUploadClick = (e) => {
    this.toggleOperationMenu(e);
    this.setState({
      isUploadMenuShow: true,
      isCreateMenuShow: false,
    });
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

  onAddFile = (filePath, isDraft) => {
    this.setState({isCreateFileDialogShow: false});
    this.props.onAddFile(filePath, isDraft);
  }

  onAddFolder = (dirPath) => {
    this.setState({isCreateFolderDialogShow: false});
    this.props.onAddFolder(dirPath);
  }

  render() {
    let dirName = this.props.path.replace('\/','');
    return (
      <Fragment>
        <div className="operation">
          {(this.props.isViewFile && this.props.permission === 'rw') && (
            <button className="btn btn-secondary operation-item" title={gettext('Edit File')} onClick={this.onEditClick}>{gettext('Edit')}</button>
          )}
          {!this.props.isViewFile && (
            <Fragment>
              {Utils.isSupportUploadFolder() ?
                <button className="btn btn-secondary operation-item" title={gettext('Upload')} onClick={this.onUploadClick}>{gettext('Upload')}</button> :
                <button className="btn btn-secondary operation-item" title={gettext('Upload')} onClick={this.uploadFile}>{gettext('Upload')}</button>
              }
              <button className="btn btn-secondary operation-item" title={gettext('New')} onClick={this.onCreateClick}>{gettext('New')}</button>
              <button className="btn btn-secondary operation-item" title={gettext('Share')} onClick={this.onShareClick}>{gettext('Share')}</button>
            </Fragment>
          )}
        </div>
        {this.state.isUploadMenuShow && (
          <ul className="menu dropdown-menu" style={this.state.operationMenuStyle}>
            <li className="dropdown-item" onClick={this.props.onUploadFile}>{gettext('File Upload')}</li>
            <li className="dropdown-item" onClick={this.props.onUploadFolder}>{gettext('Folder Upload')}</li>
          </ul>
        )}
        {this.state.isCreateMenuShow && (
          <ul className="menu dropdown-menu" style={this.state.operationMenuStyle}>
            <li className="dropdown-item" onClick={this.onCreateFolderToggle}>{gettext('New Folder')}</li>
            <li className="dropdown-item" onClick={this.onCreateFileToggle}>{gettext('New File')}</li>
            <li className="dropdown-divider"></li>
            <li className="dropdown-item" onClick={this.onCreateMarkdownToggle}>{gettext('New Markdown File')}</li>
          </ul>
        )}
        {this.state.isCreateFileDialogShow && (
          <ModalPortal>
            <CreateFile
              parentPath={this.props.path}
              fileType={this.state.fileType}
              onAddFile={this.onAddFile}
              addFileCancel={this.onCreateFileToggle}
            />
          </ModalPortal>
        )}
        {this.state.isCreateFolderDialogShow && (
          <ModalPortal>
            <CreateFolder
              parentPath={this.props.path}
              onAddFolder={this.onAddFolder}
              addFolderCancel={this.onCreateFolderToggle}
            />
          </ModalPortal>
        )}
        {this.state.isShareDialogShow &&
          <ModalPortal>
            <ShareDialog itemPath={this.props.path}
                         itemName={dirName}
                         toggleDialog={this.onShareClick}
                         isOpen={this.state.isShareDialogShow}
                         repoID={this.props.repoID}
                         isDir={true}
                         />
          </ModalPortal>
        }
      </Fragment>
    );
  }
}

DirOperationToolbar.propTypes = propTypes;

export default DirOperationToolbar;
