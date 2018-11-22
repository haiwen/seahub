import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { gettext, repoID, serviceUrl, slug, siteRoot } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import Repo from '../../models/repo';
import CommonToolbar from '../../components/toolbar/common-toolbar';
import PathToolbar from '../../components/toolbar/path-toolbar';
import MarkdownViewer from '../../components/markdown-viewer';
import DirentListView from '../../components/dirent-list-view/dirent-list-view';
import DirentDetail from '../../components/dirent-detail/dirent-details';
import CreateFolder from '../../components/dialog/create-folder-dialog';
import CreateFile from '../../components/dialog/create-file-dialog';
import FileUploader from '../../components/file-uploader/file-uploader';

const propTypes = {
  content: PropTypes.string,
  lastModified: PropTypes.string,
  latestContributor: PropTypes.string,
  permission: PropTypes.string,
  path: PropTypes.string.isRequired,
  // whether the file or dir corresponding to the path exist
  pathExist: PropTypes.bool.isRequired,
  isFileLoading: PropTypes.bool.isRequired,
  isViewFile: PropTypes.bool.isRequired,
  isDirentListLoading: PropTypes.bool.isRequired,
  direntList: PropTypes.array.isRequired,
  updateDirent: PropTypes.func.isRequired,
  onSideNavMenuClick: PropTypes.func.isRequired,
  onSearchedClick: PropTypes.func.isRequired,
  onMainNavBarClick: PropTypes.func.isRequired,
  onLinkClick: PropTypes.func.isRequired,
  onItemClick: PropTypes.func.isRequired,
  onItemDelete: PropTypes.func.isRequired,
  onItemRename: PropTypes.func.isRequired,
  onItemMove: PropTypes.func.isRequired,
  onItemCopy: PropTypes.func.isRequired,
  onAddFile: PropTypes.func.isRequired,
  onAddFolder: PropTypes.func.isRequired,
  switchViewMode: PropTypes.func.isRequired,
  onFileTagChanged: PropTypes.func.isRequired,
};

class MainPanel extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isWikiMode: true,
      newMenuShow: false,
      uploadMenuShow: false,
      showFileDialog: false,
      showFolderDialog: false,
      createFileType: '',
      isDirentDetailShow: false,
      currentDirent: null,
      currentFilePath: '',
      currentRepo: null,
      isRepoOwner: false,
    };
  }

  componentDidMount() {
    seafileAPI.getRepoInfo(repoID).then(res => {
      let repo = new Repo(res.data);
      seafileAPI.getAccountInfo().then(res => {
        let user_email = res.data.email;
        let isRepoOwner = repo.owner_email === user_email;
        this.setState({
          currentRepo: repo,
          isRepoOwner: isRepoOwner,
        });
      });
    });
    document.addEventListener('click', this.hideOperationMenu);
  }

  componentWillReceiveProps(nextProps) {
    // if (nextProps.path !== this.props.path) {
    //   this.setState({isDirentDetailShow: false});
    // }
  }

  componentWillUnmount() {
    document.removeEventListener('click', this.hideOperationMenu);
  }

  switchViewMode = (e) => {
    e.preventDefault();
    if (e.target.id === 'wiki') {
      return;
    }
    this.setState({isWikiMode: false});
    this.props.switchViewMode(e.target.id);
  }

  onSideNavMenuClick = () => {
    this.props.onSideNavMenuClick();
  }

  onMainNavBarClick = (e) => {
    this.props.onMainNavBarClick(e.target.dataset.path);
  }

  onEditClick = (e) => {
    e.preventDefault();
    window.location.href= serviceUrl + '/lib/' + repoID + '/file' + this.props.path + '?mode=edit';
  }

  onUploadClick = (e) => {
    this.toggleOperationMenu(e);
    this.setState({
      newMenuShow: false,
      uploadMenuShow: !this.state.uploadMenuShow,
    });
  }

  onNewClick = (e) => {
    this.toggleOperationMenu(e);
    this.setState({
      newMenuShow: !this.state.newMenuShow,
      uploadMenuShow: false,
    });
  }

  onShareClick = () => {
    alert('share btn clicked');
  }

  toggleOperationMenu = (e) => {
    e.nativeEvent.stopImmediatePropagation();
    let targetRect = e.target.getClientRects()[0];
    let left = targetRect.x;
    let top  = targetRect.y + targetRect.height;
    let style = {position: 'fixed', display: 'block', left: left, top: top};
    this.setState({operationMenuStyle: style});
  }

  hideOperationMenu = () => {
    this.setState({
      uploadMenuShow: false,
      newMenuShow: false,
    });
  }

  addFolder = () => {
    this.setState({showFolderDialog: !this.showFolderDialog});
  }

  addFile = () => {
    this.setState({
      showFileDialog: !this.showFileDialog,
      createFileType: '',
    });
  }

  addMarkdownFile = () => {
    this.setState({
      showFileDialog: !this.showFileDialog,
      createFileType: '.md',
    });
  }

  addFolderCancel = () => {
    this.setState({showFolderDialog: !this.state.showFolderDialog});
  }

  addFileCancel = () => {
    this.setState({showFileDialog: !this.state.showFileDialog});
  }

  onAddFile = (filePath, isDraft) => {
    this.setState({showFileDialog: !this.state.showFileDialog});
    this.props.onAddFile(filePath, isDraft);
  }

  onAddFolder = (dirPath) => {
    this.setState({showFolderDialog: !this.state.showFolderDialog});
    this.props.onAddFolder(dirPath);
  }

  onItemDetails = (dirent, direntPath) => {
    this.setState({
      currentDirent: dirent,
      currentFilePath: direntPath,
      isDirentDetailShow: true,
    });
  }

  onItemDetailsClose = () => {
    this.setState({isDirentDetailShow: false});
  }

  onFileTagChanged = (dirent, direntPath) => {
    //todos;
    this.props.onFileTagChanged(dirent, direntPath);
  }

  uploadFile = (e) => {
    e.nativeEvent.stopImmediatePropagation();
    this.uploader.onFileUpload();
  }

  uploadFolder = (e) => {
    e.nativeEvent.stopImmediatePropagation();
    this.uploader.onFolderUpload();
  }

  onFileSuccess = (file) => {

  }

  render() {
    let path = this.props.path;
    path = path[path.length - 1] === '/' ? path.slice(0, path.length - 1) : path;
    let pathList = path.split('/');
    let nodePath = '';
    let pathElem = pathList.map((item, index) => {
      if (item === '') {
        return;
      }
      if (index === (pathList.length - 1)) {
        return (
          <span key={index}><span className="path-split">/</span>{item}</span>
        );
      } else {
        nodePath += '/' + item;
        return (
          <span key={index} >
            <span className="path-split">/</span>
            <a
              className="path-link"
              data-path={nodePath}
              onClick={this.onMainNavBarClick}>
              {item}
            </a>
          </span>
        );
      }
    });

    return (
      <div className="main-panel wiki-main-panel o-hidden">
        <div className="main-panel-top panel-top">
          <div className="cur-view-toolbar border-left-show">
            <span className="sf2-icon-menu hidden-md-up d-md-none side-nav-toggle" title={gettext('Side Nav Menu')} onClick={this.onSideNavMenuClick}></span>
            <div className="file-operation">
              <div className="operation">
                {
                  this.props.permission === 'rw' &&
                  <button className="btn btn-secondary operation-item" title={gettext('Edit File')} onClick={this.onEditClick}>{gettext('Edit')}</button>
                }
                {
                  !this.props.isViewFile &&
                  <Fragment>
                    {
                      Utils.isSupportUploadFolder() ?
                        <button className="btn btn-secondary operation-item" title={gettext('Upload')} onClick={this.onUploadClick}>{gettext('Upload')}</button> :
                        <button className="btn btn-secondary operation-item" title={gettext('Upload')} onClick={this.uploadFile}>{gettext('Upload')}</button>
                    }
                    <button className="btn btn-secondary operation-item" title={gettext('New')} onClick={this.onNewClick}>{gettext('New')}</button>
                    <button className="btn btn-secondary operation-item" title={gettext('Share')} onClick={this.onShareClick}>{gettext('Share')}</button>
                  </Fragment>
                }
              </div>
              {
                this.state.uploadMenuShow &&
                <ul className="menu dropdown-menu" style={this.state.operationMenuStyle}>
                  <li className="dropdown-item" onClick={this.uploadFile}>{gettext('File Upload')}</li>
                  <li className="dropdown-item" onClick={this.uploadFolder}>{gettext('Folder Upload')}</li>
                </ul>
              }
              {
                this.state.newMenuShow &&
                <ul className="menu dropdown-menu" style={this.state.operationMenuStyle}>
                  <li className="dropdown-item" onClick={this.addFolder}>{gettext('New Folder')}</li>
                  <li className="dropdown-item" onClick={this.addFile}>{gettext('New File')}</li>
                  <li className="dropdown-divider"></li>
                  <li className="dropdown-item" onClick={this.addMarkdownFile}>{gettext('New Markdown File')}</li>
                </ul>
              }
            </div>
            <div className="view-mode btn-group">
              <button className="btn btn-secondary btn-icon sf-view-mode-btn sf2-icon-list-view" id='list' title={gettext('List')} onClick={this.switchViewMode}></button>
              <button className="btn btn-secondary btn-icon sf-view-mode-btn sf2-icon-grid-view" id='grid' title={gettext('Grid')} onClick={this.switchViewMode}></button>
              <button className={`btn btn-secondary btn-icon sf-view-mode-btn sf2-icon-two-columns ${this.state.isWikiMode ? 'current-mode' : ''}`} id='wiki' title={gettext('wiki')} onClick={this.switchViewMode}></button>
            </div>
          </div>
          <CommonToolbar onSearchedClick={this.props.onSearchedClick} searchPlaceholder={'Search files in this library'}/>
        </div>
        <div className="main-panel-center flex-direction-row">
          <div className="cur-view-container">
            <div className="cur-view-path">
              <div className="path-containter">
                <a href={siteRoot + '#common/'} className="normal">{gettext('Libraries')}</a>
                <span className="path-split">/</span>
                {this.props.path === '/' ?
                  <span>{slug}</span> :
                  <a className="path-link" data-path="/" onClick={this.onMainNavBarClick}>{slug}</a>
                }
                {pathElem}
              </div>
              <PathToolbar path={this.props.path}/>
            </div>
            <div className="cur-view-content">
              { !this.props.pathExist ?
                <div className="message empty-tip err-message"><h2>{gettext('Folder does not exist.')}</h2></div> :
                <Fragment>
                  { this.props.isViewFile ?
                    <MarkdownViewer
                      markdownContent={this.props.content}
                      latestContributor={this.props.latestContributor}
                      lastModified = {this.props.lastModified}
                      onLinkClick={this.props.onLinkClick}
                      isFileLoading={this.props.isFileLoading}
                    /> :
                    <Fragment>
                      <DirentListView
                        direntList={this.props.direntList}
                        path={this.props.path}
                        onItemClick={this.props.onItemClick}
                        onItemDelete={this.props.onItemDelete}
                        onItemRename={this.props.onItemRename}
                        onItemMove={this.props.onItemMove}
                        onItemCopy={this.props.onItemCopy}
                        onItemDetails={this.onItemDetails}
                        isDirentListLoading={this.props.isDirentListLoading}
                        updateDirent={this.props.updateDirent}
                        currentRepo={this.state.currentRepo}
                        isRepoOwner={this.state.isRepoOwner}
                      />
                      <FileUploader
                        ref={uploader => this.uploader = uploader}
                        dragAndDrop={true}
                        path={this.props.path}
                        onFileSuccess={this.onFileSuccess}
                        direntList={this.props.direntList}
                      />
                    </Fragment>
                  }
                </Fragment>
              }
            </div>
          </div>
          { this.state.isDirentDetailShow &&
            <div className="cur-view-detail">
              <DirentDetail
                dirent={this.state.currentDirent}
                direntPath={this.state.currentFilePath}
                onItemDetailsClose={this.onItemDetailsClose}
                onFileTagChanged={this.onFileTagChanged}
              />
            </div>
          }
        </div>
        {this.state.showFileDialog &&
          <CreateFile
            fileType={this.state.createFileType}
            parentPath={this.props.path}
            addFileCancel={this.addFileCancel}
            onAddFile={this.onAddFile}
          />
        }
        {this.state.showFolderDialog &&
          <CreateFolder
            parentPath={this.props.path}
            addFolderCancel={this.addFolderCancel}
            onAddFolder={this.onAddFolder}
          />
        }
      </div>
    );
  }
}

MainPanel.propTypes = propTypes;

export default MainPanel;
