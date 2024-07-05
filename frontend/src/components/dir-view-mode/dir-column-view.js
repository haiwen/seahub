import React from 'react';
import PropTypes from 'prop-types';
import DirColumnNav from './dir-column-nav';
import DirColumnFile from './dir-column-file';
import DirListView from './dir-list-view';
import DirGridView from './dir-grid-view';

const propTypes = {
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
  isFileLoadedErr: PropTypes.bool.isRequired,
  hash: PropTypes.string,
  filePermission: PropTypes.string,
  content: PropTypes.string,
  lastModified: PropTypes.string,
  latestContributor: PropTypes.string,
  onLinkClick: PropTypes.func.isRequired,
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
  onItemMove: PropTypes.func.isRequired,
  onItemCopy: PropTypes.func.isRequired,
  onItemConvert: PropTypes.func.isRequired,
  onDirentClick: PropTypes.func.isRequired,
  isAllItemSelected: PropTypes.bool.isRequired,
  onAllItemSelected: PropTypes.func.isRequired,
  selectedDirentList: PropTypes.array.isRequired,
  onItemsMove: PropTypes.func.isRequired,
  onItemsCopy: PropTypes.func.isRequired,
  onItemsDelete: PropTypes.func.isRequired,
  repoTags: PropTypes.array.isRequired,
  onFileTagChanged: PropTypes.func,
  showDirentDetail: PropTypes.func.isRequired,
  fullDirentList: PropTypes.array,
  onItemsScroll: PropTypes.func.isRequired,
  isDirentDetailShow: PropTypes.bool.isRequired
};

class DirColumnView extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      inResizing: false,
      navRate: 0.25,
    };
    this.containerWidth = null;
  }

  onResizeMouseUp = () => {
    if (this.state.inResizing) {
      this.setState({
        inResizing: false
      });
    }
    this.setCookie('navRate', this.state.navRate);
  };

  onResizeMouseDown = () => {
    this.containerWidth = this.refs.viewModeContainer.clientWidth;
    this.setState({
      inResizing: true
    });
  };

  onResizeMouseMove = (e) => {
    let sizeNavWidth = this.containerWidth / 0.78 * 0.22 + 3;
    let rate = (e.nativeEvent.clientX - sizeNavWidth) / this.containerWidth;
    if (rate < 0.1) {
      this.setState({
        inResizing: false,
        navRate: 0.12,
      });
    }
    else if (rate > 0.4) {
      this.setState({
        inResizing: false,
        navRate: 0.38,
      });
    }
    else {
      this.setState({
        navRate: rate
      });
    }
  };

  setCookie = (name, value) => {
    let cookie = name + '=' + value + ';';
    document.cookie = cookie;
  };

  getCookie = (cookiename) => {
    let name = cookiename + '=';
    let cookie = document.cookie.split(';');
    for (let i = 0, len = cookie.length; i < len; i++) {
      let c = cookie[i].trim();
      if (c.indexOf(name) == 0) {
        return c.substring(name.length, c.length) * 1;
      }
    }
    return '';
  };

  UNSAFE_componentWillMount() {
    let rate = this.getCookie('navRate');
    if (rate) {
      this.setState({
        navRate: rate,
      });
    }
  }

  render() {
    const { currentMode, isTreePanelShown } = this.props;
    const onResizeMove = this.state.inResizing ? this.onResizeMouseMove : null;
    const select = this.state.inResizing ? 'none' : '';
    const mainFlex = '1 0 ' + (1 - this.state.navRate - 0.05) * 100 + '%';
    return (
      <div className="dir-colunm-view" onMouseMove={onResizeMove} onMouseUp={this.onResizeMouseUp} ref="viewModeContainer">
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
              navRate={this.state.navRate}
              inResizing={this.state.inResizing}
              currentRepoInfo={this.props.currentRepoInfo}
              onItemMove={this.props.onItemMove}
              onItemCopy={this.props.onItemCopy}
              selectedDirentList={this.props.selectedDirentList}
              onItemsMove={this.props.onItemsMove}
            />
            <div className="dir-content-resize" onMouseDown={this.onResizeMouseDown}></div>
          </>
        )}
        <div className="dir-content-main" style={{userSelect: select, flex: mainFlex}} onScroll={this.props.isViewFile ? () => {} : this.props.onItemsScroll}>
          {this.props.isViewFile ? (
            <DirColumnFile
              path={this.props.path}
              repoID={this.props.repoID}
              hash={this.props.hash}
              isFileLoading={this.props.isFileLoading}
              isFileLoadedErr={this.props.isFileLoadedErr}
              filePermission={this.props.filePermission}
              content={this.props.content}
              currentRepoInfo={this.props.currentRepoInfo}
              lastModified={this.props.lastModified}
              latestContributor={this.props.latestContributor}
              onLinkClick={this.props.onLinkClick}
            />
          ) : (currentMode == 'list' ?
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
            /> :
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
              onAddFile={this.props.onAddFile}
              onItemClick={this.props.onItemClick}
              onItemDelete={this.props.onItemDelete}
              onItemMove={this.props.onItemMove}
              onItemCopy={this.props.onItemCopy}
              onItemConvert={this.props.onItemConvert}
              updateDirent={this.props.updateDirent}
              onAddFolder={this.props.onAddFolder}
              showDirentDetail={this.props.showDirentDetail}
              onGridItemClick={this.props.onDirentClick}
              isDirentDetailShow={this.props.isDirentDetailShow}
              onItemRename={this.props.onItemRename}
              onFileTagChanged={this.props.onFileTagChanged}
            />
          )}
        </div>
      </div>
    );
  }
}

DirColumnView.propTypes = propTypes;

export default DirColumnView;
