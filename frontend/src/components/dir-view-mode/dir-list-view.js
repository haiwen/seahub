import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import DirentNoneView from '../../components/dirent-list-view/dirent-none-view';
import RepoInfoBar from '../../components/repo-info-bar';
import DirentListView from '../../components/dirent-list-view/dirent-list-view';
import Loading from '../loading';

const propTypes = {
  path: PropTypes.string.isRequired,
  repoID: PropTypes.string.isRequired,
  currentRepoInfo: PropTypes.object.isRequired,
  isGroupOwnedRepo: PropTypes.bool.isRequired,
  userPerm: PropTypes.string,
  enableDirPrivateShare: PropTypes.bool.isRequired,
  isRepoInfoBarShow: PropTypes.bool.isRequired,
  repoTags: PropTypes.array.isRequired,
  usedRepoTags: PropTypes.array.isRequired,
  updateUsedRepoTags: PropTypes.func.isRequired,
  isDirentListLoading: PropTypes.bool.isRequired,
  direntList: PropTypes.array.isRequired,
  sortBy: PropTypes.string.isRequired,
  sortOrder: PropTypes.string.isRequired,
  sortItems: PropTypes.func.isRequired,
  onItemClick: PropTypes.func.isRequired,
  onItemSelected: PropTypes.func.isRequired,
  onItemDelete: PropTypes.func.isRequired,
  onItemRename: PropTypes.func.isRequired,
  onItemMove: PropTypes.func.isRequired,
  onDirentClick: PropTypes.func.isRequired,
  updateDirent: PropTypes.func.isRequired,
  isAllItemSelected: PropTypes.bool.isRequired,
  onAllItemSelected: PropTypes.func.isRequired,
  selectedDirentList: PropTypes.array.isRequired,
  onItemsMove: PropTypes.func.isRequired,
  onItemConvert: PropTypes.func.isRequired,
  onItemsDelete: PropTypes.func.isRequired,
  onFileTagChanged: PropTypes.func,
  showDirentDetail: PropTypes.func.isRequired,
  loadDirentList: PropTypes.func,
  fullDirentList: PropTypes.array,
  getMenuContainerSize: PropTypes.func,
  eventBus: PropTypes.object,
  updateTreeNode: PropTypes.func,
  visibleColumns: PropTypes.array,
  setVisibleColumns: PropTypes.func,
  columns: PropTypes.array,
  updateDirentStatus: PropTypes.func,
};

class DirListView extends React.Component {

  render() {

    if (this.props.path === '/' && this.props.direntList.length === 0) {
      return (
        <DirentNoneView
          path={this.props.path}
          isDirentListLoading={this.props.isDirentListLoading}
          currentRepoInfo={this.props.currentRepoInfo}
          userPerm={this.props.userPerm}
          eventBus={this.props.eventBus}
          getMenuContainerSize={this.props.getMenuContainerSize}
        />
      );
    }

    return (
      <Fragment>
        {this.props.isRepoInfoBarShow && (
          <RepoInfoBar
            repoID={this.props.repoID}
            currentPath={this.props.path}
            usedRepoTags={this.props.usedRepoTags}
            updateUsedRepoTags={this.props.updateUsedRepoTags}
            onFileTagChanged={this.props.onFileTagChanged}
          />
        )}
        {this.props.isDirentListLoading ? (
          <Loading />
        ) : (
          <DirentListView
            path={this.props.path}
            currentRepoInfo={this.props.currentRepoInfo}
            repoID={this.props.repoID}
            isGroupOwnedRepo={this.props.isGroupOwnedRepo}
            userPerm={this.props.userPerm}
            enableDirPrivateShare={this.props.enableDirPrivateShare}
            direntList={this.props.direntList}
            fullDirentList={this.props.fullDirentList}
            sortBy={this.props.sortBy}
            sortOrder={this.props.sortOrder}
            sortItems={this.props.sortItems}
            onItemClick={this.props.onItemClick}
            onItemSelected={this.props.onItemSelected}
            onItemDelete={this.props.onItemDelete}
            onItemRename={this.props.onItemRename}
            onItemMove={this.props.onItemMove}
            onDirentClick={this.props.onDirentClick}
            updateDirent={this.props.updateDirent}
            isAllItemSelected={this.props.isAllItemSelected}
            onAllItemSelected={this.props.onAllItemSelected}
            selectedDirentList={this.props.selectedDirentList}
            onItemsMove={this.props.onItemsMove}
            onItemConvert={this.props.onItemConvert}
            onItemsDelete={this.props.onItemsDelete}
            repoTags={this.props.repoTags}
            onFileTagChanged={this.props.onFileTagChanged}
            showDirentDetail={this.props.showDirentDetail}
            loadDirentList={this.props.loadDirentList}
            getMenuContainerSize={this.props.getMenuContainerSize}
            eventBus={this.props.eventBus}
            updateTreeNode={this.props.updateTreeNode}
            visibleColumns={this.props.visibleColumns}
            setVisibleColumns={this.props.setVisibleColumns}
            columns={this.props.columns}
            updateDirentStatus={this.props.updateDirentStatus}
          />
        )}
      </Fragment>
    );
  }
}

DirListView.propTypes = propTypes;

export default DirListView;
