import React from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { Utils } from '../../utils/utils';
import { gettext } from '../../utils/constants';
import CurDirPath from '../../components/cur-dir-path';
import DirTool from '../../components/cur-dir-path/dir-tool';
import Detail from '../../components/dirent-detail';
import DirColumnView from '../../components/dir-view-mode/dir-column-view';
import ToolbarForSelectedDirents from '../../components/toolbar/selected-dirents-toolbar';

import '../../css/lib-content-view.css';

const propTypes = {
  isSidePanelFolded: PropTypes.bool,
  switchViewMode: PropTypes.func.isRequired,
  isCustomPermission: PropTypes.bool,
  pathPrefix: PropTypes.array.isRequired,
  isTreePanelShown: PropTypes.bool.isRequired,
  toggleTreePanel: PropTypes.func.isRequired,
  currentMode: PropTypes.string.isRequired,
  path: PropTypes.string.isRequired,
  pathExist: PropTypes.bool.isRequired,
  // repoinfo
  repoEncrypted: PropTypes.bool.isRequired,
  currentRepoInfo: PropTypes.object.isRequired,
  repoID: PropTypes.string.isRequired,
  enableDirPrivateShare: PropTypes.bool.isRequired,
  isGroupOwnedRepo: PropTypes.bool.isRequired,
  userPerm: PropTypes.string,
  isRepoOwner: PropTypes.bool.isRequired,
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
  viewId: PropTypes.string,
  lastModified: PropTypes.string,
  latestContributor: PropTypes.string,
  currentDirent: PropTypes.object,
  onLinkClick: PropTypes.func.isRequired,
  onCloseMarkdownViewDialog: PropTypes.func,
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
  onSelectedDirentListUpdate: PropTypes.func.isRequired,
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
  unSelectDirent: PropTypes.func,
  onFilesTagChanged: PropTypes.func.isRequired,
  showShareBtn: PropTypes.bool.isRequired,
  onUploadFile: PropTypes.func.isRequired,
  onUploadFolder: PropTypes.func.isRequired,
  onToolbarFileTagChanged: PropTypes.func.isRequired,
  eventBus: PropTypes.object,
};

class LibContentContainer extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      currentDirent: null,
      hasSelectedFile: false,
    };

    this.errMessage = (<div className="message err-tip">{gettext('Folder does not exist.')}</div>);
  }

  UNSAFE_componentWillReceiveProps(nextProps) {
    if (nextProps.path !== this.props.path || nextProps.updateDetail !== this.props.updateDetail) {
      this.setState({ currentDirent: null });
    }

    if (!this.state.hasSelectedFile) {
      const { isDirentSelected } = nextProps;
      if (isDirentSelected) {
        this.setState({ hasSelectedFile: true });
      }
    }
  }

  onPathClick = (path) => {
    this.props.onMainNavBarClick(path);
  };

  onItemClick = (dirent) => {
    this.props.onItemClick(dirent);
  };

  onDirentClick = (dirent, event) => {
    this.setState({ currentDirent: dirent && dirent.isActive ? null : dirent });
    this.props.onDirentClick(dirent, event);
  };

  onItemSelected = (dirent) => {
    this.setState({ currentDirent: dirent && dirent.isActive ? null : dirent });
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
      this.setState({ currentDirent: null });
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
    const isDesktop = Utils.isDesktop();
    const { path, repoID, usedRepoTags, isDirentSelected } = this.props;
    const { hasSelectedFile } = this.state;
    let isRepoInfoBarShow = false;
    if (path === '/') {
      if (isDesktop && usedRepoTags.length !== 0) {
        isRepoInfoBarShow = true;
      }
    }

    return (
      <div className="cur-view-container">
        {this.props.currentRepoInfo.status === 'read-only' &&
          <div className="readonly-tip-message">
            {gettext('This library has been set to read-only by admin and cannot be updated.')}
          </div>
        }
        <div className="cur-view-path lib-cur-view-path">
          <div className={classnames('cur-view-path-left', { 'w-100': !isDesktop, 'animation-children': hasSelectedFile })}>
            {isDirentSelected ? (
              <ToolbarForSelectedDirents
                repoID={this.props.repoID}
                path={this.props.path}
                userPerm={this.props.userPerm}
                repoEncrypted={this.props.repoEncrypted}
                repoTags={this.props.repoTags}
                selectedDirentList={this.props.selectedDirentList}
                direntList={this.props.direntList}
                onItemsMove={this.props.onItemsMove}
                onItemsCopy={this.props.onItemsCopy}
                onItemsDelete={this.props.onItemsDelete}
                onItemRename={this.props.onItemRename}
                isRepoOwner={this.props.isRepoOwner}
                currentRepoInfo={this.props.currentRepoInfo}
                enableDirPrivateShare={this.props.enableDirPrivateShare}
                updateDirent={this.props.updateDirent}
                unSelectDirent={this.props.unSelectDirent}
                onFilesTagChanged={this.props.onFilesTagChanged}
                showShareBtn={this.props.showShareBtn}
                isGroupOwnedRepo={this.props.isGroupOwnedRepo}
                showDirentDetail={this.props.showDirentDetail}
                currentMode={this.props.currentMode}
                switchViewMode={this.props.switchViewMode}
              />
            ) : (
              <CurDirPath
                currentRepoInfo={this.props.currentRepoInfo}
                repoID={repoID}
                repoName={this.props.currentRepoInfo.repo_name}
                repoEncrypted={this.props.repoEncrypted}
                isGroupOwnedRepo={this.props.isGroupOwnedRepo}
                pathPrefix={this.props.pathPrefix}
                currentPath={this.props.path}
                userPerm={this.props.userPerm}
                isViewFile={this.props.isViewFile}
                onTabNavClick={this.props.onTabNavClick}
                onPathClick={this.onPathClick}
                fileTags={this.props.fileTags}
                direntList={this.props.direntList}
                sortBy={this.props.sortBy}
                sortOrder={this.props.sortOrder}
                sortItems={this.props.sortItems}
                toggleTreePanel={this.props.toggleTreePanel}
                enableDirPrivateShare={this.props.enableDirPrivateShare}
                showShareBtn={this.props.showShareBtn}
                onAddFolder={this.props.onAddFolder}
                onAddFile={this.props.onAddFile}
                onUploadFile={this.props.onUploadFile}
                onUploadFolder={this.props.onUploadFolder}
                fullDirentList={this.props.fullDirentList}
                filePermission={this.props.filePermission}
                onFileTagChanged={this.props.onToolbarFileTagChanged}
                repoTags={this.props.repoTags}
                onItemMove={this.props.onItemMove}
                isDesktop={isDesktop}
              />
            )}
          </div>
          {isDesktop &&
            <div className="cur-view-path-right py-1">
              <DirTool
                repoID={repoID}
                repoName={this.props.currentRepoInfo.repo_name}
                userPerm={this.props.userPerm}
                currentPath={path}
                updateUsedRepoTags={this.props.updateUsedRepoTags}
                onDeleteRepoTag={this.props.onDeleteRepoTag}
                currentMode={this.props.currentMode}
                switchViewMode={this.props.switchViewMode}
                isCustomPermission={this.props.isCustomPermission}
                sortBy={this.props.sortBy}
                sortOrder={this.props.sortOrder}
                sortItems={this.props.sortItems}
                viewId={this.props.viewId}
                viewType={this.props.viewType}
              />
            </div>
          }
        </div>
        <div className='cur-view-content lib-content-container' onScroll={this.onItemsScroll}>
          {!this.props.pathExist && this.errMessage}
          {this.props.pathExist && (
            <DirColumnView
              isSidePanelFolded={this.props.isSidePanelFolded}
              isTreePanelShown={this.props.isTreePanelShown}
              currentMode={this.props.currentMode}
              currentDirent={this.props.currentDirent}
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
              viewId={this.props.viewId}
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
              onSelectedDirentListUpdate={this.props.onSelectedDirentListUpdate}
              onItemsMove={this.props.onItemsMove}
              onItemsCopy={this.props.onItemsCopy}
              onItemsDelete={this.props.onItemsDelete}
              onFileTagChanged={this.props.onFileTagChanged}
              showDirentDetail={this.props.showDirentDetail}
              onItemsScroll={this.onItemsScroll}
              isDirentDetailShow={this.props.isDirentDetailShow}
              eventBus={this.props.eventBus}
              onCloseMarkdownViewDialog={this.props.onCloseMarkdownViewDialog}
            />
          )}
          {this.props.isDirentDetailShow && (
            <Detail
              path={path}
              repoID={repoID}
              currentRepoInfo={this.props.currentRepoInfo}
              dirent={this.state.currentDirent}
              repoTags={this.props.repoTags}
              fileTags={this.props.isViewFile ? this.props.fileTags : []}
              onFileTagChanged={this.props.onFileTagChanged}
              onClose={this.props.closeDirentDetail}
            />
          )}
        </div>
      </div>
    );
  }
}

LibContentContainer.propTypes = propTypes;

export default LibContentContainer;
