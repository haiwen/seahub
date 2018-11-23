import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { gettext, repoID, serviceUrl, slug, siteRoot } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import URLDecorator from '../../utils/url-decorator';
import Repo from '../../models/repo';
import CommonToolbar from '../../components/toolbar/common-toolbar';
import PathToolbar from '../../components/toolbar/path-toolbar';
import MarkdownViewer from '../../components/markdown-viewer';
import DirentListView from '../../components/dirent-list-view/dirent-list-view';
import DirentDetail from '../../components/dirent-detail/dirent-details';
import CreateFolder from '../../components/dialog/create-folder-dialog';
import CreateFile from '../../components/dialog/create-file-dialog';
import ZipDownloadDialog from '../../components/dialog/zip-download-dialog';
import MoveDirentDialog from '../../components/dialog/move-dirent-dialog';
import CopyDirentDialog from '../../components/dialog/copy-dirent-dialog';
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
  isDirentSelected: PropTypes.bool.isRequired,
  isAllDirentSelected: PropTypes.bool.isRequired,
  direntList: PropTypes.array.isRequired,
  selectedDirentList: PropTypes.array.isRequired,
  updateDirent: PropTypes.func.isRequired,
  onSideNavMenuClick: PropTypes.func.isRequired,
  onSearchedClick: PropTypes.func.isRequired,
  onMainNavBarClick: PropTypes.func.isRequired,
  onLinkClick: PropTypes.func.isRequired,
  onItemClick: PropTypes.func.isRequired,
  onAllDirentSelected: PropTypes.func.isRequired,
  onItemSelected: PropTypes.func.isRequired,
  onItemDelete: PropTypes.func.isRequired,
  onItemRename: PropTypes.func.isRequired,
  onItemMove: PropTypes.func.isRequired,
  onItemCopy: PropTypes.func.isRequired,
  onAddFile: PropTypes.func.isRequired,
  onAddFolder: PropTypes.func.isRequired,
  switchViewMode: PropTypes.func.isRequired,
  onFileTagChanged: PropTypes.func.isRequired,
  onItemsMove: PropTypes.func.isRequired,
  onItemsCopy: PropTypes.func.isRequired,
  onItemsDelete: PropTypes.func.isRequired,
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
      direntPath: '',
      currentRepo: null,
      isRepoOwner: false,
      progress: 0,
      isProgressDialogShow: false,
      isMoveDialogShow: false,
      isCopyDialogShow: false,
      isMutipleOperation: false,
    };
    this.zip_token = null;
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
      direntPath: direntPath,
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

  onSelectedMoveToggle = () => {
    this.setState({
      isMutipleOperation: true,
      isMoveDialogShow: true,
      currentDirent: null,
      direntPath: '',
    });
  }

  onSelectedCopyToggle = () => {
    this.setState({
      isMutipleOperation: true,
      isCopyDialogShow: true,
      currentDirent: null,
      direntPath: '',
    });
  }

  onItemMoveToggle = (dirent, direntPath) => {
    this.setState({
      isMutipleOperation: false,
      isMoveDialogShow: true,
      currentDirent: dirent,
      direntPath: direntPath,
    });
  }
  
  onItemCopyToggle = (dirent, direntPath) => {
    this.setState({
      isMutipleOperation: false,
      isCopyDialogShow: true,
      currentDirent: dirent,
      direntPath: direntPath
    });
  }

  onCancelMove = () => {
    this.setState({isMoveDialogShow: false});
  }

  onCancelCopy = () => {
    this.setState({isCopyDialogShow: false});
  }

  onItemsDownload = () => {
    let selectedDirentList = this.props.selectedDirentList;
    if (selectedDirentList.length) {
      if (selectedDirentList.length === 1 && !selectedDirentList[0].isDir()) {
        let direntPath = Utils.joinPath(this.props.path, selectedDirentList[0].name);
        let url = URLDecorator.getUrl({type: 'download_file_url', repoID: repoID, filePath: direntPath});
        location.href= url;
        return;
      }
      let selectedDirentNames = selectedDirentList.map(dirent => {
        return dirent.name;
      });
      this.setState({isProgressDialogShow: true, progress: 0});
      seafileAPI.zipDownload(repoID, this.props.path, selectedDirentNames).then(res => {
        this.zip_token = res.data['zip_token'];
        this.addDownloadAnimation();
        this.interval = setInterval(this.addDownloadAnimation, 1000);
      });
    }
  }

  onItemDownload = (dirent, direntPath) => {
    if (dirent.type === 'dir') {
      this.setState({isProgressDialogShow: true, progress: 0});
      seafileAPI.zipDownload(repoID, this.props.path, dirent.name).then(res => {
        this.zip_token = res.data['zip_token'];
        this.addDownloadAnimation();
        this.interval = setInterval(this.addDownloadAnimation, 1000);
      }).catch(() => {
        clearInterval(this.interval);
        // Toast.error(gettext(''));
        //todo;
      });
    } else {
      let url = URLDecorator.getUrl({type: 'download_file_url', repoID: repoID, filePath: direntPath});
      location.href = url;
    }
  }

  addDownloadAnimation = () => {
    let _this = this;
    let token = this.zip_token;
    seafileAPI.queryZipProgress(token).then(res => {
      let data = res.data;
      let progress = data.total === 0 ? 100 : (data.zipped / data.total * 100).toFixed(0);
      this.setState({progress: parseInt(progress)});

      if (data['total'] === data['zipped']) {
        this.setState({
          progress: 100
        });
        clearInterval(this.interval);
        location.href = URLDecorator.getUrl({type: 'download_dir_zip_url', token: token});
        setTimeout(function() {
          _this.setState({isProgressDialogShow: false});
        }, 500);
      }

    });
  }

  onCancelDownload = () => {
    let zip_token = this.zip_token;
    seafileAPI.cancelZipTask(zip_token).then(res => {
      this.setState({
        isProgressDialogShow: false,
      });
    });
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
            <div className="dir-operation">
              {this.props.isDirentSelected &&
                <div className="operation mutiple-dirents-operation">
                  <button className="btn btn-secondary operation-item op-icon sf2-icon-move" title={gettext('Move')} onClick={this.onSelectedMoveToggle}></button>
                  <button className="btn btn-secondary operation-item op-icon sf2-icon-copy" title={gettext('Copy')} onClick={this.onSelectedCopyToggle}></button>
                  <button className="btn btn-secondary operation-item op-icon sf2-icon-delete" title={gettext('Delete')} onClick={this.props.onItemsDelete}></button>
                  <button className="btn btn-secondary operation-item op-icon sf2-icon-download" title={gettext('Download')} onClick={this.onItemsDownload}></button>
                </div>
              }
              {!this.props.isDirentSelected &&
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
              }
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
                        onItemDownload={this.onItemDownload}
                        onItemMoveToggle={this.onItemMoveToggle}
                        onItemCopyToggle={this.onItemCopyToggle}
                        onItemDetails={this.onItemDetails}
                        isDirentListLoading={this.props.isDirentListLoading}
                        updateDirent={this.props.updateDirent}
                        currentRepo={this.state.currentRepo}
                        isRepoOwner={this.state.isRepoOwner}
                        isAllItemSelected={this.props.isAllDirentSelected}
                        onAllItemSelected={this.props.onAllDirentSelected}
                        onItemSelected={this.props.onItemSelected}
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
                direntPath={this.state.direntPath}
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
        {this.state.isMoveDialogShow &&
          <MoveDirentDialog
            path={this.props.path}
            isMutipleOperation={this.state.isMutipleOperation}
            selectedDirentList={this.props.selectedDirentList}
            dirent={this.state.currentDirent}
            direntPath={this.state.direntPath}
            onItemMove={this.props.onItemMove}
            onItemsMove={this.props.onItemsMove}
            onCancelMove={this.onCancelMove}
          />
        }
        {this.state.isCopyDialogShow &&
          <CopyDirentDialog
            path={this.props.path}
            isMutipleOperation={this.state.isMutipleOperation}
            selectedDirentList={this.props.selectedDirentList}
            dirent={this.state.currentDirent}
            direntPath={this.state.direntPath}
            onItemCopy={this.props.onItemCopy}
            onItemsCopy={this.props.onItemsCopy}
            onCancelCopy={this.onCancelCopy}
          />
        }
        {this.state.isProgressDialogShow &&
          <ZipDownloadDialog progress={this.state.progress} onCancelDownload={this.onCancelDownload}
          />
        }
      </div>
    );
  }
}

MainPanel.propTypes = propTypes;

export default MainPanel;
