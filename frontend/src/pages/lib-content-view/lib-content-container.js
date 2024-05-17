import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';
import CurDirPath from '../../components/cur-dir-path';
import DirentDetail from '../../components/dirent-detail/dirent-details';
import LibDetail from '../../components/dirent-detail/lib-details';
import DirColumnView from '../../components/dir-view-mode/dir-column-view';

import '../../css/lib-content-view.css';

const propTypes = {
  pathPrefix: PropTypes.array.isRequired,
  isTreePanelShown: PropTypes.bool.isRequired,
  toggleTreePanel: PropTypes.func.isRequired,
  currentMode: PropTypes.string.isRequired,
  path: PropTypes.string.isRequired,
  pathExist: PropTypes.bool.isRequired,
  // repoinfo
  currentRepoInfo: PropTypes.object.isRequired,
  repoID: PropTypes.string.isRequired,
  enableDirPrivateShare: PropTypes.bool.isRequired,
  isGroupOwnedRepo: PropTypes.bool.isRequired,
  userPerm: PropTypes.string,
  // path func
  onTabNavClick: PropTypes.func.isRequired,
  onMainNavBarClick: PropTypes.func.isRequired,
  // file
  isViewFile: PropTypes.bool.isRequired,
  isFileLoadedErr: PropTypes.bool.isRequired,
  hash: PropTypes.string,
  fileTags: PropTypes.array.isRequired,
  isFileLoading: PropTypes.bool.isRequired,
  filePermission: PropTypes.string,
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
  repoTags: PropTypes.array.isRequired,
  usedRepoTags: PropTypes.array.isRequired,
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
  onItemConvert: PropTypes.func.isRequired,
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
  updateDetail: PropTypes.bool.isRequired,
  onListContainerScroll: PropTypes.func.isRequired,
  onDirentClick: PropTypes.func.isRequired,
  direntDetailPanelTab: PropTypes.string,
  loadDirentList: PropTypes.func,
  fullDirentList: PropTypes.array,
};

class LibContentContainer extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      currentDirent: null,
    };

    this.errMessage = (<div className="message err-tip">{gettext('Folder does not exist.')}</div>);
  }

  UNSAFE_componentWillReceiveProps(nextProps) {
    if (nextProps.path !== this.props.path || nextProps.updateDetail !== this.props.updateDetail) {
      this.setState({currentDirent: null});
    }
  }

  onPathClick = (path) => {
    this.props.onMainNavBarClick(path);
    this.props.closeDirentDetail();
  };

  onItemClick = (dirent) => {
    this.props.onItemClick(dirent);
    this.props.closeDirentDetail();
  };

  onDirentClick = (dirent) => {
    this.setState({currentDirent: dirent});
    this.props.onDirentClick(dirent);
  };

  onItemSelected = (dirent) => {
    this.setState({currentDirent: dirent});
    this.props.onItemSelected(dirent);
  };

  onItemDelete = (dirent) => {
    this.checkCurrentDirent(dirent);
    this.props.onItemDelete(dirent);
  };

  onItemMove = (destRepo, dirent, selectedPath, currentPath) => {
    this.checkCurrentDirent(dirent);
    this.props.onItemMove(destRepo, dirent, selectedPath, currentPath);
  };

  checkCurrentDirent = (deletedDirent) => {
    let { currentDirent } = this.state;
    if (currentDirent && deletedDirent.name === currentDirent.name) {
      this.setState({currentDirent: null});
    }
  };

  onItemsScroll = (e) => {
    let target = e.target;

    if (target.scrollTop === 0) {
      return;
    }

    if (target.scrollTop + target.clientHeight + 1 >= target.scrollHeight) {
      this.props.onListContainerScroll();
    }
  };

  render() {
    let { path, repoID, usedRepoTags } = this.props;
    let isRepoInfoBarShow = false;
    if (path === '/') {
      if (usedRepoTags.length !== 0) {
        isRepoInfoBarShow = true;
      }
    }

    return (
      <Fragment>
        <div className="cur-view-container">
          {this.props.currentRepoInfo.status === 'read-only' &&
            <div className="readonly-tip-message">
              {gettext('This library has been set to read-only by admin and cannot be updated.')}
            </div>
          }
          <div className="cur-view-path">
            <CurDirPath
              repoID={repoID}
              repoName={this.props.currentRepoInfo.repo_name}
              pathPrefix={this.props.pathPrefix}
              currentPath={this.props.path}
              userPerm={this.props.userPerm}
              isViewFile={this.props.isViewFile}
              onTabNavClick={this.props.onTabNavClick}
              onPathClick={this.onPathClick}
              updateUsedRepoTags={this.props.updateUsedRepoTags}
              fileTags={this.props.fileTags}
              onDeleteRepoTag={this.props.onDeleteRepoTag}
              direntList={this.props.direntList}
              sortBy={this.props.sortBy}
              sortOrder={this.props.sortOrder}
              sortItems={this.props.sortItems}
              toggleTreePanel={this.props.toggleTreePanel}
            />
          </div>
          <div className={`cur-view-content lib-content-container ${this.props.isTreePanelShown ? 'view-mode-container' : ''}`} onScroll={this.onItemsScroll}>
            {!this.props.pathExist && this.errMessage}
            {this.props.pathExist && (
              <DirColumnView
                isTreePanelShown={this.props.isTreePanelShown}
                currentMode={this.props.currentMode}
                path={this.props.path}
                repoID={repoID}
                currentRepoInfo={this.props.currentRepoInfo}
                isGroupOwnedRepo={this.props.isGroupOwnedRepo}
                userPerm={this.props.userPerm}
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
                filePermission={this.props.filePermission}
                content={this.props.content}
                lastModified={this.props.lastModified}
                latestContributor={this.props.latestContributor}
                onLinkClick={this.props.onLinkClick}
                isRepoInfoBarShow={isRepoInfoBarShow}
                repoTags={this.props.repoTags}
                usedRepoTags={this.props.usedRepoTags}
                updateUsedRepoTags={this.props.updateUsedRepoTags}
                isDirentListLoading={this.props.isDirentListLoading}
                direntList={this.props.direntList}
                fullDirentList={this.props.fullDirentList}
                sortBy={this.props.sortBy}
                sortOrder={this.props.sortOrder}
                sortItems={this.props.sortItems}
                onAddFolder={this.props.onAddFolder}
                onAddFile={this.props.onAddFile}
                onItemClick={this.onItemClick}
                onItemSelected={this.onItemSelected}
                onItemDelete={this.onItemDelete}
                onItemRename={this.props.onItemRename}
                onItemMove={this.onItemMove}
                onItemCopy={this.props.onItemCopy}
                onItemConvert={this.props.onItemConvert}
                onDirentClick={this.onDirentClick}
                updateDirent={this.props.updateDirent}
                isAllItemSelected={this.props.isAllDirentSelected}
                onAllItemSelected={this.props.onAllDirentSelected}
                selectedDirentList={this.props.selectedDirentList}
                onItemsMove={this.props.onItemsMove}
                onItemsCopy={this.props.onItemsCopy}
                onItemsDelete={this.props.onItemsDelete}
                onFileTagChanged={this.props.onFileTagChanged}
                showDirentDetail={this.props.showDirentDetail}
                onItemsScroll={this.onItemsScroll}
                isDirentDetailShow={this.props.isDirentDetailShow}
              />
            )}
          </div>
        </div>
        {this.props.isDirentDetailShow &&
          <Fragment>
            <div className="cur-view-detail">
              {(this.props.path === '/' && !this.state.currentDirent) ?
                <LibDetail
                  currentRepo={this.props.currentRepoInfo}
                  closeDetails={this.props.closeDirentDetail}
                /> :
                <DirentDetail
                  repoID={repoID}
                  path={this.props.path}
                  dirent={this.state.currentDirent}
                  currentRepoInfo={this.props.currentRepoInfo}
                  repoTags={this.props.repoTags}
                  fileTags={this.props.isViewFile ? this.props.fileTags : []}
                  onFileTagChanged={this.props.onFileTagChanged}
                  onItemDetailsClose={this.props.closeDirentDetail}
                  direntDetailPanelTab={this.props.direntDetailPanelTab}
                />
              }
            </div>
          </Fragment>
        }
      </Fragment>
    );
  }
}

LibContentContainer.propTypes = propTypes;

export default LibContentContainer;
