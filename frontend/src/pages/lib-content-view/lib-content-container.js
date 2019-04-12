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
  repoPermission: PropTypes.bool.isRequired,
  enableDirPrivateShare: PropTypes.bool.isRequired,
  userPrem: PropTypes.bool,
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
  fileTags: PropTypes.array.isRequired,
  goDraftPage: PropTypes.func.isRequired,
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
  usedRepoTags: PropTypes.array.isRequired,
  readmeMarkdown: PropTypes.object,
  updateUsedRepoTags: PropTypes.func.isRequired,
  // list
  isDirentListLoading: PropTypes.bool.isRequired,
  direntList: PropTypes.array.isRequired,
  showShareBtn: PropTypes.bool.isRequired,
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
  isDirentDetailShow: PropTypes.bool.isRequired,
  selectedDirent: PropTypes.object,
  selectedDirentList: PropTypes.array.isRequired,
  onItemsMove: PropTypes.func.isRequired,
  onItemsCopy: PropTypes.func.isRequired,
  onItemsDelete: PropTypes.func.isRequired,
  closeDirentDetail: PropTypes.func.isRequired,
  showDirentDetail: PropTypes.func.isRequired,
  onDeleteRepoTag: PropTypes.func.isRequired,
};

class LibContentContainer extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      currentDirent: {},
    };

    this.errMessage = (<div className="message err-tip">{gettext('Folder does not exist.')}</div>);
  }

  onPathClick = (path) => {
    this.props.onMainNavBarClick(path);
    this.props.closeDirentDetail();
  }

  onItemClick = (dirent) => {
    this.props.onItemClick(dirent);
    this.props.closeDirentDetail();
  }

  // on '<tr>'
  onDirentClick = (dirent) => {
    if (this.props.isDirentDetailShow) {
      this.onItemDetails(dirent);
    }
  }

  onItemDetails = (dirent) => {
    this.setState({
      currentDirent: dirent,
    });
    this.props.showDirentDetail();
  }

  onItemDetailsClose = () => {
    this.props.closeDirentDetail();
  }

  componentWillReceiveProps (nextProps) {
    if (nextProps.isDirentDetailShow) {
      this.setState({
        isDirentDetailShow: nextProps.isDirentDetailShow
      });
    }
    if (nextProps.selectedDirent && nextProps.isDirentDetailShow) {
      this.setState({
        currentDirent: nextProps.selectedDirent,
      });
    }
  }

  render() {
    let { path, repoID, usedRepoTags, readmeMarkdown, draftCounts } = this.props;
    let isRepoInfoBarShow = false;
    if (path === '/') {
      if (usedRepoTags.length !== 0 || readmeMarkdown !== null || draftCounts !== 0) {
        isRepoInfoBarShow = true;
      }
    } 

    return (
      <Fragment>
        <div className="cur-view-container">
          <div className="cur-view-path">
            <CurDirPath 
              repoID={repoID}
              repoName={this.props.currentRepoInfo.repo_name}
              pathPrefix={this.props.pathPrefix}
              currentPath={this.props.path} 
              permission={this.props.repoPermission} 
              isViewFile={this.props.isViewFile}
              onTabNavClick={this.props.onTabNavClick}
              onPathClick={this.onPathClick}
              updateUsedRepoTags={this.props.updateUsedRepoTags}
              fileTags={this.props.fileTags}
              onDeleteRepoTag={this.props.onDeleteRepoTag}
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
                    isGroupOwnedRepo={this.props.isGroupOwnedRepo}
                    enableDirPrivateShare={this.props.enableDirPrivateShare}
                    isRepoInfoBarShow={isRepoInfoBarShow}
                    usedRepoTags={this.props.usedRepoTags}
                    readmeMarkdown={this.props.readmeMarkdown}
                    draftCounts={this.props.draftCounts}
                    updateUsedRepoTags={this.props.updateUsedRepoTags}
                    isDirentListLoading={this.props.isDirentListLoading}
                    direntList={this.props.direntList}
                    showShareBtn={this.props.showShareBtn}
                    sortBy={this.props.sortBy}
                    sortOrder={this.props.sortOrder}
                    sortItems={this.props.sortItems}
                    onAddFolder={this.props.onAddFolder}
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
                    selectedDirentList={this.props.selectedDirentList}
                    onItemsMove={this.props.onItemsMove}
                    onItemsCopy={this.props.onItemsCopy}
                    onItemsDelete={this.props.onItemsDelete}
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
                    filePermission={this.props.filePermission}
                    content={this.props.content}
                    lastModified={this.props.lastModified}
                    latestContributor={this.props.latestContributor}
                    onLinkClick={this.props.onLinkClick}
                    isRepoInfoBarShow={isRepoInfoBarShow}
                    usedRepoTags={this.props.usedRepoTags}
                    readmeMarkdown={this.props.readmeMarkdown}
                    draftCounts={this.props.draftCounts}
                    updateUsedRepoTags={this.props.updateUsedRepoTags}
                    isDirentListLoading={this.props.isDirentListLoading}
                    direntList={this.props.direntList}
                    showShareBtn={this.props.showShareBtn}
                    sortBy={this.props.sortBy}
                    sortOrder={this.props.sortOrder}
                    sortItems={this.props.sortItems}
                    onAddFolder={this.props.onAddFolder}
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
                    selectedDirentList={this.props.selectedDirentList}
                    onItemsMove={this.props.onItemsMove}
                    onItemsCopy={this.props.onItemsCopy}
                    onItemsDelete={this.props.onItemsDelete}
                  />
                )}
              </Fragment>
            )}
          </div>
        </div>
        {this.props.isDirentDetailShow && (
          <div className="cur-view-detail">
            <DirentDetail
              repoID={repoID}
              path={this.props.path}
              dirent={this.state.currentDirent}
              currentRepoInfo={this.props.currentRepoInfo}
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
