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
import MarkdownContentViewer from '../../components/markdown-viewer';
import DirentListView from '../../components/dirent-list-view/dirent-list-view';
import DirentDetail from '../../components/dirent-detail/dirent-details';
import FileUploader from '../../components/file-uploader/file-uploader';
import FileTagsViewer from '../../components/filetags-viewer';
import ReadmeContentViewer from '../../components/readme-viewer';

const propTypes = {
  content: PropTypes.string,
  lastModified: PropTypes.string,
  latestContributor: PropTypes.string,
  permission: PropTypes.string,
  hash: PropTypes.string,
  path: PropTypes.string.isRequired,
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
      isRepoOwner: false,
      activeTitleIndex: -1,
      readmeContent: '',
      isReadmeLoading: false,
    };
    this.titlesInfo = null;
    this.pageScroll = false;
  }

  componentDidMount() {
    seafileAPI.getRepoInfo(repoID).then(res => {
      let repoInfo = new RepoInfo(res.data);
      seafileAPI.getAccountInfo().then(res => {
        let user_email = res.data.email;
        let isRepoOwner = repoInfo.owner_email === user_email;
        this.setState({
          currentRepoInfo: repoInfo,
          isRepoOwner: isRepoOwner,
        });
      });
    });
    if (this.props.hash) {
      let hash = this.props.hash;
      setTimeout(function() {
        window.location.hash = hash;
      }, 500);
    }
  }

  showReadme = (filePath, fileName) => {
    this.setState({
      isReadmeLoading: true,
    });
    let readmePath = Utils.joinPath(filePath, fileName);
    seafileAPI.getFileDownloadLink(repoID, readmePath).then((res) => {
      seafileAPI.getFileContent(res.data).then((res) => {
        this.setState({
          readmeContent: res.data,
          isReadmeLoading: false,
        });
      });
    });
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

  handlePageScroll = () => {    
    if (this.props.pathExist && this.props.isViewFile && !this.pageScroll &&  this.titlesInfo && this.titlesInfo.length > 0) {
      this.pageScroll = true;
      let that = this;
      setTimeout(function() {
        that.pageScroll = false;
      }, 100);
      const contentScrollTop = this.refs.curViewContent.scrollTop + 180;
      let activeTitleIndex;
      if (contentScrollTop <= this.titlesInfo[0]) {
        activeTitleIndex = 0;
      }
      else if (contentScrollTop > this.titlesInfo[this.titlesInfo.length - 1]) {
        activeTitleIndex = this.titlesInfo.length - 1;
      }
      else {
        for (let i = 0; i < this.titlesInfo.length - 1; i++) {
          if (contentScrollTop > this.titlesInfo[i] && this.titlesInfo[i + 1] &&
            contentScrollTop < this.titlesInfo[i + 1]) {
            activeTitleIndex = i;
            break;
          }
        }
      }
      this.setState({
        activeTitleIndex: activeTitleIndex
      });
    }
  }

  onContentRendered = (markdownViewer) => {
    this.titlesInfo = markdownViewer.titlesInfo;
  }

  render() {
    const ErrMessage = (<div className="message empty-tip err-message"><h2>{gettext('Folder does not exist.')}</h2></div>);
    
    return (
      <div className="main-panel wiki-main-panel o-hidden">
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
                  isDraft={this.props.isDraft}
                  hasDraft={this.props.hasDraft}
                  permission={this.props.permission}
                  isViewFile={this.props.isViewFile}
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
            <div className="cur-view-content" onScroll={this.handlePageScroll} ref="curViewContent">
              {!this.props.pathExist ?
                ErrMessage :
                <Fragment>
                  { this.props.isViewFile ?
                    <MarkdownContentViewer
                      markdownContent={this.props.content}
                      latestContributor={this.props.latestContributor}
                      lastModified = {this.props.lastModified}
                      isFileLoading={this.props.isFileLoading}
                      activeTitleIndex={this.state.activeTitleIndex}
                      onContentRendered={this.onContentRendered}
                      onLinkClick={this.props.onLinkClick}
                      isDraft={this.props.isDraft}
                      hasDraft={this.props.hasDraft}
                      reviewID={this.props.reviewID}
                      reviewStatus={this.props.reviewStatus}
                      goDraftPage={this.props.goDraftPage}
                      goReviewPage={this.props.goReviewPage}
                    /> :
                    <Fragment>
                      {(this.props.usedRepoTags.length > 0 && this.props.path === '/') && (
                        <div className="tags-summary-bar">
                          <FileTagsViewer
                            repoID={repoID}
                            currentPath={this.props.path}
                            usedRepoTags={this.props.usedRepoTags}
                          />
                        </div>
                      )}
                      <DirentListView
                        path={this.props.path}
                        repoID={repoID}
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
                        onItemDetails={this.onItemDetails}
                        isDirentListLoading={this.props.isDirentListLoading}
                        updateDirent={this.props.updateDirent}
                        currentRepoInfo={this.state.currentRepoInfo}
                        isRepoOwner={this.state.isRepoOwner}
                        isAllItemSelected={this.props.isAllDirentSelected}
                        onAllItemSelected={this.props.onAllDirentSelected}
                        onItemSelected={this.props.onItemSelected}
                      />
                      {!this.props.isViewFile && this.props.direntList.map(dirent => {
                        let fileName = dirent.name.toLowerCase();
                        if (fileName === 'readme.md' || fileName === 'readme.markdown') {
                          return (
                            <ReadmeContentViewer
                              readmeContent={this.state.readmeContent}
                              isReadmeLoading={this.state.isReadmeLoading}
                              onContentRendered={this.onContentRendered}
                              showReadme={this.showReadme}
                              filePath={this.props.path}
                              fileName={dirent.name}
                            />
                          );
                        }
                      })}
                      <FileUploader
                        ref={uploader => this.uploader = uploader}
                        dragAndDrop={true}
                        path={this.props.path}
                        repoID={repoID}
                        direntList={this.props.direntList}
                        onFileUploadSuccess={this.onFileUploadSuccess}
                      />
                    </Fragment>
                  }
                </Fragment>
              }
            </div>
            {/* {!this.props.isViewFile && this.props.direntList.map(dirent => {
              let fileName = dirent.name.toLowerCase();
              if (fileName === 'readme.md' || fileName === 'readme.markdown') {
                return (
                  <div key={dirent.id} className="cur-view-readme">
                    <ReadmeContentViewer
                      readmeContent={this.state.readmeContent}
                      isReadmeLoading={this.state.isReadmeLoading}
                      onContentRendered={this.onContentRendered}
                      showReadme={this.showReadme}
                      filePath={this.props.path}
                      fileName={dirent.name}
                    />
                  </div>
                );
              }
            })} */}
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
