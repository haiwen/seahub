import React from 'react';
import PropTypes from 'prop-types';
import DirColumnNav from './dir-column-nav';
import MarkdownViewerDialog from './markdown-viewer-dialog';
import DirListView from './dir-list-view';
import DirGridView from './dir-grid-view';
import { SIDE_PANEL_FOLDED_WIDTH } from '../../constants';
import ResizeBar from '../resize-bar';
import { DRAG_HANDLER_HEIGHT, MAX_SIDE_PANEL_RATE, MIN_SIDE_PANEL_RATE } from '../resize-bar/constants';
import { SeafileMetadata } from '../../metadata';
import { mediaUrl } from '../../utils/constants';
import { GRID_MODE, LIST_MODE, METADATA_MODE } from './constants';

const propTypes = {
  isSidePanelFolded: PropTypes.bool,
  isTreePanelShown: PropTypes.bool.isRequired,
  currentMode: PropTypes.string.isRequired,
  path: PropTypes.string.isRequired,
  repoID: PropTypes.string.isRequired,
  // repoinfo
  currentRepoInfo: PropTypes.object.isRequired,
  enableDirPrivateShare: PropTypes.bool.isRequired,
  userPerm: PropTypes.string,
  isGroupOwnedRepo: PropTypes.bool.isRequired,
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
  // file
  isViewFile: PropTypes.bool.isRequired,
  isFileLoading: PropTypes.bool.isRequired,
  filePermission: PropTypes.string,
  content: PropTypes.string,
  viewId: PropTypes.string,
  lastModified: PropTypes.string,
  latestContributor: PropTypes.string,
  onLinkClick: PropTypes.func.isRequired,
  onCloseMarkdownViewDialog: PropTypes.func,
  // repo content
  isRepoInfoBarShow: PropTypes.bool.isRequired,
  usedRepoTags: PropTypes.array.isRequired,
  updateUsedRepoTags: PropTypes.func.isRequired,
  // list
  isDirentListLoading: PropTypes.bool.isRequired,
  direntList: PropTypes.array.isRequired,
  sortBy: PropTypes.string.isRequired,
  sortOrder: PropTypes.string.isRequired,
  sortItems: PropTypes.func.isRequired,
  onAddFolder: PropTypes.func.isRequired,
  onAddFile: PropTypes.func.isRequired,
  updateDirent: PropTypes.func.isRequired,
  onItemClick: PropTypes.func.isRequired,
  onItemSelected: PropTypes.func.isRequired,
  onItemDelete: PropTypes.func.isRequired,
  onItemRename: PropTypes.func.isRequired,
  deleteFilesCallback: PropTypes.func,
  renameFileCallback: PropTypes.func,
  onItemMove: PropTypes.func.isRequired,
  onItemCopy: PropTypes.func.isRequired,
  onItemConvert: PropTypes.func.isRequired,
  onDirentClick: PropTypes.func.isRequired,
  isAllItemSelected: PropTypes.bool.isRequired,
  onAllItemSelected: PropTypes.func.isRequired,
  selectedDirentList: PropTypes.array.isRequired,
  onSelectedDirentListUpdate: PropTypes.func.isRequired,
  onItemsMove: PropTypes.func.isRequired,
  onItemsCopy: PropTypes.func.isRequired,
  onItemsDelete: PropTypes.func.isRequired,
  repoTags: PropTypes.array.isRequired,
  onFileTagChanged: PropTypes.func,
  showDirentDetail: PropTypes.func.isRequired,
  fullDirentList: PropTypes.array,
  onItemsScroll: PropTypes.func.isRequired,
  isDirentDetailShow: PropTypes.bool.isRequired,
  eventBus: PropTypes.object,
};

class DirColumnView extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      inResizing: false,
      navRate: parseFloat(localStorage.getItem('sf_dir_content_nav_rate') || 0.25),
    };
    this.containerWidth = null;
    this.resizeBarRef = React.createRef();
    this.dragHandlerRef = React.createRef();
    this.viewModeContainer = React.createRef();
    this.dirContentMain = React.createRef();
  }

  onResizeMouseUp = () => {
    if (this.state.inResizing) {
      this.setState({
        inResizing: false
      });
    }
    localStorage.setItem('sf_dir_content_nav_rate', this.state.navRate);
  };

  onResizeMouseDown = () => {
    this.containerWidth = this.viewModeContainer.current.clientWidth;
    this.setState({
      inResizing: true
    });
  };

  onResizeMouseMove = (e) => {
    const { isSidePanelFolded } = this.props;
    let sizeNavWidth = isSidePanelFolded ? SIDE_PANEL_FOLDED_WIDTH + 3 : window.innerWidth - this.containerWidth;
    let rate = (e.nativeEvent.clientX - sizeNavWidth) / this.containerWidth;
    this.setState({
      navRate: Math.max(Math.min(rate, MAX_SIDE_PANEL_RATE), MIN_SIDE_PANEL_RATE),
    });
  };

  onResizeMouseOver = (event) => {
    if (!this.dragHandlerRef.current) return;
    const { top } = this.resizeBarRef.current.getBoundingClientRect();
    const dragHandlerRefTop = event.pageY - top - DRAG_HANDLER_HEIGHT / 2;
    this.setDragHandlerTop(dragHandlerRefTop);
  };

  setDragHandlerTop = (top) => {
    this.dragHandlerRef.current.style.top = top + 'px';
  };

  getMenuContainerSize = () => {
    const { innerWidth, innerHeight } = window;
    return { width: innerWidth, height: innerHeight };
  };

  render() {
    const { currentMode, isTreePanelShown } = this.props;
    const { navRate, inResizing } = this.state;
    const dirContentMainStyle = {
      userSelect: inResizing ? 'none' : '',
      flex: '1 0 ' + (1 - navRate) * 100 + '%',
    };
    return (
      <div
        className="dir-column-view"
        onMouseMove={inResizing ? this.onResizeMouseMove : null}
        onMouseUp={this.onResizeMouseUp}
        ref={this.viewModeContainer}
      >
        {isTreePanelShown && (
          <>
            <DirColumnNav
              currentPath={this.props.path}
              userPerm={this.props.userPerm}
              isTreeDataLoading={this.props.isTreeDataLoading}
              treeData={this.props.treeData}
              currentNode={this.props.currentNode}
              onNodeClick={this.props.onNodeClick}
              onNodeCollapse={this.props.onNodeCollapse}
              onNodeExpanded={this.props.onNodeExpanded}
              onAddFolderNode={this.props.onAddFolderNode}
              onAddFileNode={this.props.onAddFileNode}
              onRenameNode={this.props.onRenameNode}
              onDeleteNode={this.props.onDeleteNode}
              repoID={this.props.repoID}
              navRate={navRate}
              inResizing={inResizing}
              currentRepoInfo={this.props.currentRepoInfo}
              onItemMove={this.props.onItemMove}
              onItemCopy={this.props.onItemCopy}
              selectedDirentList={this.props.selectedDirentList}
              onItemsMove={this.props.onItemsMove}
              getMenuContainerSize={this.getMenuContainerSize}
              direntList={this.props.direntList}
              updateDirent={this.props.updateDirent}
            />
            <ResizeBar
              resizeBarRef={this.resizeBarRef}
              dragHandlerRef={this.dragHandlerRef}
              resizeBarStyle={{ left: `calc(${navRate ? navRate * 100 + '%' : '25%'} - 1px)` }}
              dragHandlerStyle={{ height: DRAG_HANDLER_HEIGHT }}
              onResizeMouseDown={this.onResizeMouseDown}
              onResizeMouseOver={this.onResizeMouseOver}
            />
          </>
        )}
        <div
          className="dir-content-main" style={dirContentMainStyle}
          onScroll={this.props.isViewFile ? () => {} : this.props.onItemsScroll}
          ref={this.dirContentMain}
        >
          {currentMode === METADATA_MODE &&
            <SeafileMetadata
              mediaUrl={mediaUrl}
              repoID={this.props.repoID}
              repoInfo={this.props.currentRepoInfo}
              viewID={this.props.viewId}
              deleteFilesCallback={this.props.deleteFilesCallback}
              renameFileCallback={this.props.renameFileCallback}
            />
          }
          {currentMode === LIST_MODE &&
            <DirListView
              path={this.props.path}
              repoID={this.props.repoID}
              currentRepoInfo={this.props.currentRepoInfo}
              isGroupOwnedRepo={this.props.isGroupOwnedRepo}
              userPerm={this.props.userPerm}
              enableDirPrivateShare={this.props.enableDirPrivateShare}
              isRepoInfoBarShow={this.props.isRepoInfoBarShow}
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
              onItemClick={this.props.onItemClick}
              onItemSelected={this.props.onItemSelected}
              onItemDelete={this.props.onItemDelete}
              onItemRename={this.props.onItemRename}
              onItemMove={this.props.onItemMove}
              onItemCopy={this.props.onItemCopy}
              onItemConvert={this.props.onItemConvert}
              onDirentClick={this.props.onDirentClick}
              updateDirent={this.props.updateDirent}
              isAllItemSelected={this.props.isAllItemSelected}
              onAllItemSelected={this.props.onAllItemSelected}
              selectedDirentList={this.props.selectedDirentList}
              onItemsMove={this.props.onItemsMove}
              onItemsCopy={this.props.onItemsCopy}
              onItemsDelete={this.props.onItemsDelete}
              repoTags={this.props.repoTags}
              onFileTagChanged={this.props.onFileTagChanged}
              showDirentDetail={this.props.showDirentDetail}
              getMenuContainerSize={this.getMenuContainerSize}
              eventBus={this.props.eventBus}
            />
          }
          {currentMode === GRID_MODE &&
            <DirGridView
              path={this.props.path}
              repoID={this.props.repoID}
              currentRepoInfo={this.props.currentRepoInfo}
              isGroupOwnedRepo={this.props.isGroupOwnedRepo}
              userPerm={this.props.userPerm}
              enableDirPrivateShare={this.props.enableDirPrivateShare}
              onRenameNode={this.props.onRenameNode}
              isRepoInfoBarShow={this.props.isRepoInfoBarShow}
              repoTags={this.props.repoTags}
              usedRepoTags={this.props.usedRepoTags}
              updateUsedRepoTags={this.props.updateUsedRepoTags}
              isDirentListLoading={this.props.isDirentListLoading}
              direntList={this.props.direntList}
              fullDirentList={this.props.fullDirentList}
              selectedDirentList={this.props.selectedDirentList}
              onSelectedDirentListUpdate={this.props.onSelectedDirentListUpdate}
              onAddFile={this.props.onAddFile}
              onItemClick={this.props.onItemClick}
              onItemDelete={this.props.onItemDelete}
              onItemMove={this.props.onItemMove}
              onItemCopy={this.props.onItemCopy}
              onItemConvert={this.props.onItemConvert}
              onItemsMove={this.props.onItemsMove}
              onItemsCopy={this.props.onItemsCopy}
              onItemsDelete={this.props.onItemsDelete}
              updateDirent={this.props.updateDirent}
              onAddFolder={this.props.onAddFolder}
              showDirentDetail={this.props.showDirentDetail}
              onGridItemClick={this.props.onDirentClick}
              isDirentDetailShow={this.props.isDirentDetailShow}
              onItemRename={this.props.onItemRename}
              onFileTagChanged={this.props.onFileTagChanged}
              getMenuContainerSize={this.getMenuContainerSize}
              eventBus={this.props.eventBus}
            />
          }
          {this.props.isViewFile &&
            <MarkdownViewerDialog
              repoID={this.props.repoID}
              filePath={this.props.getMarkDownFilePath()}
              fileName={this.props.getMarkDownFileName()}
              openMarkdownFile={this.props.openMarkdownFile}
              isFileLoading={this.props.isFileLoading}
              content={this.props.content}
              lastModified={this.props.lastModified}
              latestContributor={this.props.latestContributor}
              onLinkClick={this.props.onLinkClick}
              onCloseMarkdownViewDialog={this.props.onCloseMarkdownViewDialog}
            />
          }
        </div>
      </div>
    );
  }
}

DirColumnView.propTypes = propTypes;

export default DirColumnView;
