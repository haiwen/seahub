import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import cookie from 'react-cookies';
import { gettext, repoID, siteRoot, permission } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import RepoInfo from '../../models/repo-info';
import CommonToolbar from '../../components/toolbar/common-toolbar';
import ViewModeToolbar from '../../components/toolbar/view-mode-toolbar';
import DirOperationToolBar from '../../components/toolbar/dir-operation-toolbar';
import MutipleDirOperationToolbar from '../../components/toolbar/mutilple-dir-operation-toolbar';
import CurDirPath from '../../components/cur-dir-path';
import WikiMarkdownViewer from '../../components/wiki-markdown-viewer';
import DirentListView from '../../components/dirent-list-view/dirent-list-view';
import DirentDetail from '../../components/dirent-detail/dirent-details';
import FileUploader from '../../components/file-uploader/file-uploader';
import RepoInfoBar from '../../components/repo-info-bar';

const propTypes = {
  content: PropTypes.string,
  lastModified: PropTypes.string,
  latestContributor: PropTypes.string,
  permission: PropTypes.string,
  hash: PropTypes.string,
  path: PropTypes.string.isRequired,
  repoName: PropTypes.string.isRequired,
  repoEncrypted: PropTypes.bool.isRequired,
  showShareBtn: PropTypes.bool.isRequired,
  enableDirPrivateShare: PropTypes.bool.isRequired,
  userPerm: PropTypes.string.isRequired,
  isAdmin: PropTypes.bool.isRequired,
  isGroupOwnedRepo: PropTypes.bool.isRequired,
  // whether the file or dir corresponding to the path exist
  pathExist: PropTypes.bool.isRequired,
  isFileLoading: PropTypes.bool.isRequired,
  isViewFile: PropTypes.bool.isRequired,
  isDirentListLoading: PropTypes.bool.isRequired,
  isDirentSelected: PropTypes.bool.isRequired,
  isAllDirentSelected: PropTypes.bool.isRequired,
  direntList: PropTypes.array.isRequired,
  sortBy: PropTypes.string.isRequired,
  sortOrder: PropTypes.string.isRequired,
  sortItems: PropTypes.func.isRequired,
  selectedDirentList: PropTypes.array.isRequired,
  updateDirent: PropTypes.func.isRequired,
  onSideNavMenuClick: PropTypes.func.isRequired,
  onSearchedClick: PropTypes.func.isRequired,
  onMainNavBarClick: PropTypes.func.isRequired,
  onItemClick: PropTypes.func.isRequired,
  onAllDirentSelected: PropTypes.func.isRequired,
  onItemSelected: PropTypes.func.isRequired,
  onItemDelete: PropTypes.func.isRequired,
  onItemRename: PropTypes.func.isRequired,
  onItemMove: PropTypes.func.isRequired,
  onItemCopy: PropTypes.func.isRequired,
  onAddFile: PropTypes.func.isRequired,
  onAddFolder: PropTypes.func.isRequired,
  onFileTagChanged: PropTypes.func.isRequired,
  onItemsMove: PropTypes.func.isRequired,
  onItemsCopy: PropTypes.func.isRequired,
  onItemsDelete: PropTypes.func.isRequired,
  onLinkClick: PropTypes.func.isRequired,
  onFileUploadSuccess: PropTypes.func.isRequired,
  isDraft: PropTypes.bool,
  hasDraft: PropTypes.bool,
  reviewStatus: PropTypes.any,
  goReviewPage: PropTypes.func,
  goDraftPage: PropTypes.func,
  reviewID: PropTypes.any,
  usedRepoTags: PropTypes.array.isRequired,
  readmeMarkdown: PropTypes.object,
  draftCounts: PropTypes.number,
  reviewCounts: PropTypes.number,
  updateUsedRepoTags: PropTypes.func.isRequired,
};

class MainPanel extends Component {

  constructor(props) {
    super(props);
    this.state = {
      currentMode: 'wiki',
      isDirentDetailShow: false,
      currentDirent: null,
      direntPath: '',
      currentRepoInfo: null,
    };
  }

  componentDidMount() {
    seafileAPI.getRepoInfo(repoID).then(res => {
      let repoInfo = new RepoInfo(res.data);
      this.setState({
        currentRepoInfo: repoInfo,
      });
    });
    if (this.props.hash) {
      let hash = this.props.hash;
      setTimeout(function() {
        window.location.hash = hash;
      }, 500);
    }
  }

  switchViewMode = (mode) => {
    cookie.save('view_mode', mode, { path: '/' });
    let repoName = this.state.currentRepoInfo.repo_name;
    let dirPath = this.props.isViewFile ? Utils.getDirName(this.props.path) : this.props.path;
    window.location.href = siteRoot + 'library/' + repoID + '/' + repoName + dirPath;
  }

  onSideNavMenuClick = () => {
    this.props.onSideNavMenuClick();
  }

  onItemClick = (dirent) => {
    this.setState({isDirentDetailShow: false});
    this.props.onItemClick(dirent);
  }


  onMainNavBarClick = (path) => {
    this.setState({isDirentDetailShow: false});
    this.props.onMainNavBarClick(path);
  }

  // on '<tr>'
  onDirentClick = (dirent) => {
    if (this.state.isDirentDetailShow) {
      this.onItemDetails(dirent);
    }
  }

  onItemDetails = (dirent) => {
    this.setState({
      currentDirent: dirent,
      isDirentDetailShow: true,
    });
  }

  onItemDetailsClose = () => {
    this.setState({isDirentDetailShow: false});
  }

  onFileTagChanged = (dirent, direntPath) => {
    this.props.onFileTagChanged(dirent, direntPath);
  }

  onUploadFile = (e) => {
    e.nativeEvent.stopImmediatePropagation();
    this.uploader.onFileUpload();
  }

  onUploadFolder = (e) => {
    e.nativeEvent.stopImmediatePropagation();
    this.uploader.onFolderUpload();
  }

  onFileUploadSuccess = (direntObject) => {
    this.props.onFileUploadSuccess(direntObject);
  }

  render() {

    const ErrMessage = (<div className="message err-tip">{gettext('Folder does not exist.')}</div>);
    const showRepoInfoBar = this.props.path === '/' && (
                            this.props.usedRepoTags.length != 0 || this.props.readmeMarkdown != null ||
                            this.props.draftCounts != 0 || this.props.reviewCounts != 0);
    
    return (
      <div className="main-panel wiki-main-panel o-hidden">
        <div className="main-panel-north border-left-show">
          <div className="cur-view-toolbar">
            <span className="sf2-icon-menu hidden-md-up d-md-none side-nav-toggle" title={gettext('Side Nav Menu')} onClick={this.onSideNavMenuClick}></span>
            <div className="dir-operation">
              {this.props.isDirentSelected ?
                <MutipleDirOperationToolbar
                  repoID={repoID} 
                  path={this.props.path}
                  selectedDirentList={this.props.selectedDirentList}
                  onItemsMove={this.props.onItemsMove}
                  onItemsCopy={this.props.onItemsCopy}
                  onItemsDelete={this.props.onItemsDelete}
                /> :
                <DirOperationToolBar 
                  path={this.props.path}
                  repoID={repoID}
                  repoName={this.props.repoName}
                  repoEncrypted={this.props.repoEncrypted}
                  isDraft={this.props.isDraft}
                  hasDraft={this.props.hasDraft}
                  direntList={this.props.direntList}
                  permission={this.props.permission}
                  isViewFile={this.props.isViewFile}
                  showShareBtn={this.props.showShareBtn}
                  enableDirPrivateShare={this.props.enableDirPrivateShare}
                  userPerm={this.props.userPerm}
                  isAdmin={this.props.isAdmin}
                  isGroupOwnedRepo={this.props.isGroupOwnedRepo}
                  onAddFile={this.props.onAddFile}
                  onAddFolder={this.props.onAddFolder}
                  onUploadFile={this.onUploadFile}
                  onUploadFolder={this.onUploadFolder}
                />
              }
            </div>
            <ViewModeToolbar currentMode={this.state.currentMode} switchViewMode={this.switchViewMode}/>
          </div>
          <CommonToolbar repoID={repoID} onSearchedClick={this.props.onSearchedClick} searchPlaceholder={gettext('Search files in this library')}/>
        </div>
        <div className="main-panel-center flex-row">
          <div className="cur-view-container">
            <div className="cur-view-path">
              {this.state.currentRepoInfo && (
                <CurDirPath 
                  repoID={repoID}
                  repoName={this.state.currentRepoInfo.repo_name}
                  currentPath={this.props.path} 
                  permission={permission} 
                  onPathClick={this.onMainNavBarClick}
                  isViewFile={this.props.isViewFile}
                />
              )}
            </div>
            <div className="cur-view-content">
              {!this.props.pathExist && ErrMessage }
              {(this.props.pathExist && this.props.isViewFile) && (
                <WikiMarkdownViewer
                  isFileLoading={this.props.isFileLoading}
                  markdownContent={this.props.content}
                  latestContributor={this.props.latestContributor}
                  lastModified = {this.props.lastModified}
                  onLinkClick={this.props.onLinkClick}
                >
                  <Fragment>
                    {this.props.reviewStatus === 'open' &&
                      <div className='seafile-btn-view-review text-center'>
                        <div className='tag tag-green'> 
                          {gettext('This file is in review stage')}
                          <a className="ml-2" onMouseDown={this.props.goReviewPage}>{gettext('View Review')}</a>
                        </div>
                      </div>
                    }
                    {(!this.props.isDraft && this.props.hasDraft && this.props.reviewStatus !== 'open') &&
                      <div className='seafile-btn-view-review text-center'>
                        <div className='tag tag-green'>
                          {gettext('This file is in draft stage.')}
                          <a className="ml-2" onMouseDown={this.props.goDraftPage}>{gettext('Edit Draft')}</a>
                        </div>
                      </div>
                    }
                  </Fragment>
                </WikiMarkdownViewer>
              )}
              {(this.props.pathExist && !this.props.isViewFile) && (
                <Fragment>
                  {showRepoInfoBar && (
                    <RepoInfoBar
                      repoID={repoID}
                      currentPath={this.props.path}
                      usedRepoTags={this.props.usedRepoTags}
                      readmeMarkdown={this.props.readmeMarkdown}
                      draftCounts={this.props.draftCounts}
                      reviewCounts={this.props.reviewCounts}
                      updateUsedRepoTags={this.props.updateUsedRepoTags}
                    />
                  )}
                  <DirentListView
                    path={this.props.path}
                    repoID={repoID}
                    repoEncrypted={this.props.repoEncrypted}
                    isRepoOwner={this.props.isRepoOwner}
                    isAdmin={this.props.isAdmin}
                    isGroupOwnedRepo={this.props.isGroupOwnedRepo}
                    enableDirPrivateShare={this.props.enableDirPrivateShare}
                    direntList={this.props.direntList}
                    sortBy={this.props.sortBy}
                    sortOrder={this.props.sortOrder}
                    sortItems={this.props.sortItems}
                    onAddFile={this.props.onAddFile}
                    onItemClick={this.onItemClick}
                    onItemDelete={this.props.onItemDelete}
                    onItemRename={this.props.onItemRename}
                    onItemMove={this.props.onItemMove}
                    onItemCopy={this.props.onItemCopy}
                    onDirentClick={this.onDirentClick}
                    onItemDetails={this.onItemDetails}
                    isDirentListLoading={this.props.isDirentListLoading}
                    updateDirent={this.props.updateDirent}
                    currentRepoInfo={this.state.currentRepoInfo}
                    isAllItemSelected={this.props.isAllDirentSelected}
                    onAllItemSelected={this.props.onAllDirentSelected}
                    onItemSelected={this.props.onItemSelected}
                  />
                  <FileUploader
                    ref={uploader => this.uploader = uploader}
                    dragAndDrop={true}
                    path={this.props.path}
                    repoID={repoID}
                    direntList={this.props.direntList}
                    onFileUploadSuccess={this.onFileUploadSuccess}
                  />
                </Fragment>
              )}
            </div>
          </div>
          {this.state.isDirentDetailShow && (
            <div className="cur-view-detail">
              <DirentDetail
                repoID={repoID}
                path={this.props.path}
                dirent={this.state.currentDirent}
                direntPath={this.state.direntPath}
                onItemDetailsClose={this.onItemDetailsClose}
                onFileTagChanged={this.onFileTagChanged}
              />
            </div>
          )}
        </div>
      </div>
    );
  }
}

MainPanel.propTypes = propTypes;

export default MainPanel;
