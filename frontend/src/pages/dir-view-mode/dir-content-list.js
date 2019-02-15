import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';
import CommonToolbar from '../../components/toolbar/common-toolbar';
import ViewModeToolbar from '../../components/toolbar/view-mode-toolbar';
import DirOperationToolBar from '../../components/toolbar/dir-operation-toolbar';
import MutipleDirOperationToolbar from '../../components/toolbar/mutilple-dir-operation-toolbar';
import CurDirPath from '../../components/cur-dir-path';
import DirentListView from '../../components/dirent-list-view/dirent-list-view';
import WikiMarkdownViewer from '../../components/wiki-markdown-viewer';
import DirentDetail from '../../components/dirent-detail/dirent-details';
import FileUploader from '../../components/file-uploader/file-uploader';
import RepoInfoBar from '../../components/repo-info-bar';

const propTypes = {
  currentMode: PropTypes.string.isRequired,
  path: PropTypes.string.isRequired,
  pathExist: PropTypes.bool.isRequired,
  hash: PropTypes.string,
  isViewFile: PropTypes.bool.isRequired,
  // repo
  currentRepoInfo: PropTypes.object,  // Initially not loaded
  repoID: PropTypes.string.isRequired,
  repoName: PropTypes.string.isRequired,
  repoPermission: PropTypes.bool.isRequired,
  repoEncrypted: PropTypes.bool.isRequired,
  isAdmin: PropTypes.bool.isRequired,
  userPerm: PropTypes.string.isRequired,
  showShareBtn: PropTypes.bool.isRequired,
  enableDirPrivateShare: PropTypes.bool.isRequired,
  isRepoOwner: PropTypes.bool.isRequired,
  isGroupOwnedRepo: PropTypes.bool.isRequired,
  // toolbar
  selectedDirentList: PropTypes.array.isRequired,
  onItemsMove: PropTypes.func.isRequired,
  onItemsCopy: PropTypes.func.isRequired,
  onItemsDelete: PropTypes.func.isRequired,
  switchViewMode: PropTypes.func.isRequired,
  onSearchedClick: PropTypes.func.isRequired,
  onMainNavBarClick: PropTypes.func.isRequired,
  // repo content
  isDraft: PropTypes.bool,
  hasDraft: PropTypes.bool,
  draftCounts: PropTypes.number,
  goDraftPage: PropTypes.func.isRequired,
  reviewID: PropTypes.any,
  reviewStatus: PropTypes.any,
  reviewCounts: PropTypes.number,
  goReviewPage: PropTypes.func.isRequired,
  usedRepoTags: PropTypes.array.isRequired,
  readmeMarkdown: PropTypes.object,
  updateUsedRepoTags: PropTypes.func.isRequired,
  // file 
  isFileLoading: PropTypes.bool.isRequired,
  filePermission: PropTypes.bool,
  content: PropTypes.string,
  lastModified: PropTypes.string,
  latestContributor: PropTypes.string,
  onLinkClick: PropTypes.func.isRequired,
  // dirent list
  isDirentListLoading: PropTypes.bool.isRequired,
  direntList: PropTypes.array.isRequired,
  sortBy: PropTypes.string.isRequired,
  sortOrder: PropTypes.string.isRequired,
  sortItems: PropTypes.func.isRequired,
  updateDirent: PropTypes.func.isRequired,
  onItemClick: PropTypes.func.isRequired,
  onItemSelected: PropTypes.func.isRequired,
  onItemDelete: PropTypes.func.isRequired,
  onItemRename: PropTypes.func.isRequired,
  onItemMove: PropTypes.func.isRequired,
  onItemCopy: PropTypes.func.isRequired,
  onAddFolder: PropTypes.func.isRequired,
  onAddFile: PropTypes.func.isRequired,
  onFileTagChanged: PropTypes.func.isRequired,
  isDirentSelected: PropTypes.bool.isRequired,
  isAllDirentSelected: PropTypes.bool.isRequired,
  onAllDirentSelected: PropTypes.func.isRequired,
  onFileUploadSuccess: PropTypes.func.isRequired,
};

class DirContentList extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      currentDirent: null,
      isDirentDetailShow: false,
    };
  }

  onPathClick = (path) => {
    this.setState({isDirentDetailShow: false});
    this.props.onPathClick(path);
  }

  onItemClick = (dirent) => {
    this.setState({isDirentDetailShow: false});
    this.props.onItemClick(dirent);
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

  onUploadFile = (e) => {
    e.nativeEvent.stopImmediatePropagation();
    this.uploader.onFileUpload();
  }

  onUploadFolder = (e) => {
    e.nativeEvent.stopImmediatePropagation();
    this.uploader.onFolderUpload();
  }

  switchViewMode = (mode) => {
    if (mode === this.state.currentMode) {
      return;
    }
    this.props.switchViewMode(mode);
  }

  onFileUploadSuccess = (direntObject) => {
    this.props.onFileUploadSuccess(direntObject);
  }

  render() {
    let repoID = this.props.repoID;
    const errMessage = (<div className="message err-tip">{gettext('Folder does not exist.')}</div>);
    const showRepoInfoBar = this.props.path === '/' && (
                            this.props.usedRepoTags.length != 0 || this.props.readmeMarkdown != null ||
                            this.props.draftCounts != 0 || this.props.reviewCounts != 0);
    return (
      <div className="main-panel dir-main-content o-hidden">
        <div className="main-panel-north">
          <div className="cur-view-toolbar border-left-show">
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
            <ViewModeToolbar currentMode={this.props.currentMode} switchViewMode={this.switchViewMode}/>
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
                  permission={this.props.repoPermission} 
                  onPathClick={this.onMainNavBarClick}
                  isViewFile={this.props.isViewFile}
                />
              )}
            </div>
            <div className="cur-view-content">
              {!this.props.pathExist && errMessage }
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
                    currentRepoInfo={this.props.currentRepoInfo}
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

DirContentList.propTypes = propTypes;

export default DirContentList;
