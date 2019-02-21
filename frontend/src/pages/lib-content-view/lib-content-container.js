import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';
import CurDirPath from '../../components/cur-dir-path';
import DirentDetail from '../../components/dirent-detail/dirent-details';
import DirListView from '../../components/dir-view-mode/dir-list-view';
import DirGridView from '../../components/dir-view-mode/dir-grid-view';
import DirColumnView from '../../components/dir-view-mode/dir-column-view';

const propTypes = {
  pathPrefix: PropTypes.array.isRequired,
  currentMode: PropTypes.string.isRequired,
  path: PropTypes.string.isRequired,
  pathExist: PropTypes.bool.isRequired,
  // repoinfo
  currentRepoInfo: PropTypes.object.isRequired,
  repoID: PropTypes.string.isRequired,
  repoName: PropTypes.string.isRequired,
  repoPermission: PropTypes.bool.isRequired,
  repoEncrypted: PropTypes.bool.isRequired,
  enableDirPrivateShare: PropTypes.bool.isRequired,
  userPrem: PropTypes.bool,
  isAdmin: PropTypes.bool.isRequired,
  isRepoOwner: PropTypes.bool.isRequired,
  isGroupOwnedRepo: PropTypes.bool.isRequired,
  // path func
  onTabNavClick: PropTypes.func.isRequired,
  onMainNavBarClick: PropTypes.func.isRequired,
  // file
  isViewFile: PropTypes.bool.isRequired,
  isFileLoadedErr: PropTypes.bool.isRequired,
  hash: PropTypes.string,
  isDraft: PropTypes.bool.isRequired,
  hasDraft: PropTypes.bool.isRequired,
  goDraftPage: PropTypes.func.isRequired,
  reviewStatus: PropTypes.string,
  goReviewPage: PropTypes.func.isRequired,
  isFileLoading: PropTypes.bool.isRequired,
  filePermission: PropTypes.bool.isRequired,
  content: PropTypes.string,
  lastModified: PropTypes.string,
  latestContributor: PropTypes.string,
  onLinkClick: PropTypes.func.isRequired,
  // tree
  isTreeDataLoading: PropTypes.bool.isRequired,
  treeData: PropTypes.object.isRequired,
  currentNode: PropTypes.object,
  onNodeClick: PropTypes.func.isRequired,
  onNodeCollapse: PropTypes.func.isRequired,
  onNodeExpanded: PropTypes.func.isRequired,
  onRenameNode: PropTypes.func.isRequired,
  onDeleteNode: PropTypes.func.isRequired,
  onAddFileNode: PropTypes.func.isRequired,
  onAddFolderNode: PropTypes.func.isRequired,
  // repo content
  draftCounts: PropTypes.number,
  reviewCounts: PropTypes.number,
  usedRepoTags: PropTypes.array.isRequired,
  readmeMarkdown: PropTypes.object,
  updateUsedRepoTags: PropTypes.func.isRequired,
  // list
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
};

class LibContentContainer extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      currentDirent: null,
      isDirentDetailShow: false,
    };

    this.errMessage = (<div className="message err-tip">{gettext('Folder does not exist.')}</div>);
  }

  onPathClick = (path) => {
    this.setState({isDirentDetailShow: false});
    this.props.onMainNavBarClick(path);
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

  render() {
    let { path, repoID, usedRepoTags, readmeMarkdown, draftCounts, reviewCounts } = this.props;
    let isRepoInfoBarShow = false;
    if (path === '/') {
      if (usedRepoTags.length !== 0 || readmeMarkdown !== null || draftCounts !== 0 || reviewCounts !== 0) {
        isRepoInfoBarShow = true;
      }
    } 

    return (
      <Fragment>
        <div className="cur-view-container">
          <div className="cur-view-path">
            <CurDirPath 
              pathPrefix={this.props.pathPrefix}
              currentPath={this.props.path} 
              repoID={repoID}
              repoName={this.props.currentRepoInfo.repo_name}
              permission={this.props.repoPermission} 
              onTabNavClick={this.props.onTabNavClick}
              onPathClick={this.onPathClick}
            />
          </div>
          <div className={`cur-view-content ${this.props.currentMode === 'column' ? 'view-mode-container' : ''}`}>
            {!this.props.pathExist && this.errMessage}
            {this.props.pathExist && (
              <Fragment>
                {this.props.currentMode === 'list' && (
                  <DirListView 
                    path={this.props.path}
                    repoID={repoID}
                    currentRepoInfo={this.props.currentRepoInfo}
                    repoEncrypted={this.props.repoEncrypted}
                    isRepoOwner={this.props.isRepoOwner}
                    isAdmin={this.props.isAdmin}
                    isGroupOwnedRepo={this.props.isGroupOwnedRepo}
                    enableDirPrivateShare={this.props.enableDirPrivateShare}
                    isRepoInfoBarShow={isRepoInfoBarShow}
                    usedRepoTags={this.props.usedRepoTags}
                    readmeMarkdown={this.props.readmeMarkdown}
                    draftCounts={this.props.draftCounts}
                    reviewCounts={this.props.draftCounts}
                    updateUsedRepoTags={this.props.updateUsedRepoTags}
                    isDirentListLoading={this.props.isDirentListLoading}
                    direntList={this.props.direntList}
                    sortBy={this.props.sortBy}
                    sortOrder={this.props.sortOrder}
                    sortItems={this.props.sortItems}
                    onAddFile={this.props.onAddFile}
                    onItemClick={this.onItemClick}
                    onItemSelected={this.props.onItemSelected}
                    onItemDelete={this.props.onItemDelete}
                    onItemRename={this.props.onItemRename}
                    onItemMove={this.props.onItemMove}
                    onItemCopy={this.props.onItemCopy}
                    onDirentClick={this.onDirentClick}
                    onItemDetails={this.onItemDetails}
                    updateDirent={this.props.updateDirent}
                    isAllItemSelected={this.props.isAllDirentSelected}
                    onAllItemSelected={this.props.onAllDirentSelected}
                  />
                )}
                {this.props.currentMode === 'grid' && (
                  <DirGridView 
                  />
                )}
                {this.props.currentMode === 'column' && (
                  <DirColumnView 
                    path={this.props.path}
                    repoID={repoID}
                    currentRepoInfo={this.props.currentRepoInfo}
                    repoPermission={this.props.repoPermission}
                    repoEncrypted={this.props.repoEncrypted}
                    isRepoOwner={this.props.isRepoOwner}
                    isAdmin={this.props.isAdmin}
                    isGroupOwnedRepo={this.props.isGroupOwnedRepo}
                    enableDirPrivateShare={this.props.enableDirPrivateShare}
                    isTreeDataLoading={this.props.isTreeDataLoading}
                    treeData={this.props.treeData}
                    currentNode={this.props.currentNode}
                    onNodeClick={this.props.onNodeClick}
                    onNodeCollapse={this.props.onNodeCollapse}
                    onNodeExpanded={this.props.onNodeExpanded}
                    onAddFolderNode={this.props.onAddFolder}
                    onAddFileNode={this.props.onAddFile}
                    onRenameNode={this.props.onRenameNode}
                    onDeleteNode={this.props.onDeleteNode}
                    isViewFile={this.props.isViewFile}
                    isFileLoading={this.props.isFileLoading}
                    isFileLoadedErr={this.props.isFileLoadedErr}
                    hash={this.props.hash}
                    isDraft={this.props.isDraft}
                    hasDraft={this.props.hasDraft}
                    goDraftPage={this.props.goDraftPage}
                    reviewStatus={this.props.reviewStatus}
                    goReviewPage={this.props.goReviewPage}
                    filePermission={this.props.filePermission}
                    content={this.props.content}
                    lastModified={this.props.lastModified}
                    latestContributor={this.props.latestContributor}
                    onLinkClick={this.props.onLinkClick}
                    isRepoInfoBarShow={isRepoInfoBarShow}
                    usedRepoTags={this.props.usedRepoTags}
                    readmeMarkdown={this.props.readmeMarkdown}
                    draftCounts={this.props.draftCounts}
                    reviewCounts={this.props.draftCounts}
                    updateUsedRepoTags={this.props.updateUsedRepoTags}
                    isDirentListLoading={this.props.isDirentListLoading}
                    direntList={this.props.direntList}
                    sortBy={this.props.sortBy}
                    sortOrder={this.props.sortOrder}
                    sortItems={this.props.sortItems}
                    onAddFile={this.props.onAddFile}
                    onItemClick={this.onItemClick}
                    onItemSelected={this.props.onItemSelected}
                    onItemDelete={this.props.onItemDelete}
                    onItemRename={this.props.onItemRename}
                    onItemMove={this.props.onItemMove}
                    onItemCopy={this.props.onItemCopy}
                    onDirentClick={this.onDirentClick}
                    onItemDetails={this.onItemDetails}
                    updateDirent={this.props.updateDirent}
                    isAllItemSelected={this.props.isAllDirentSelected}
                    onAllItemSelected={this.props.onAllDirentSelected}
                  />
                )}
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
              onItemDetailsClose={this.onItemDetailsClose}
              onFileTagChanged={this.props.onFileTagChanged}
            />
          </div>
        )}
      </Fragment>
    );
  }
}

LibContentContainer.propTypes = propTypes;

export default LibContentContainer;
