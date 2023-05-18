import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import DirentNoneView from '../../components/dirent-list-view/dirent-none-view';
import RepoInfoBar from '../../components/repo-info-bar';
import DirentListView from '../../components/dirent-list-view/dirent-list-view';

const propTypes = {
  path: PropTypes.string.isRequired,
  repoID: PropTypes.string.isRequired,
  currentRepoInfo: PropTypes.object.isRequired,
  isGroupOwnedRepo: PropTypes.bool.isRequired,
  userPerm: PropTypes.string,
  enableDirPrivateShare: PropTypes.bool.isRequired,
  isRepoInfoBarShow: PropTypes.bool.isRequired,
  usedRepoTags: PropTypes.array.isRequired,
  readmeMarkdown: PropTypes.object,
  draftCounts: PropTypes.number,
  updateUsedRepoTags: PropTypes.func.isRequired,
  isDirentListLoading: PropTypes.bool.isRequired,
  direntList: PropTypes.array.isRequired,
  sortBy: PropTypes.string.isRequired,
  sortOrder: PropTypes.string.isRequired,
  sortItems: PropTypes.func.isRequired,
  onAddFolder: PropTypes.func.isRequired,
  onAddFile: PropTypes.func.isRequired,
  onItemClick: PropTypes.func.isRequired,
  onItemSelected: PropTypes.func.isRequired,
  onItemDelete: PropTypes.func.isRequired,
  onItemRename: PropTypes.func.isRequired,
  onItemMove: PropTypes.func.isRequired,
  onItemCopy: PropTypes.func.isRequired,
  onDirentClick: PropTypes.func.isRequired,
  updateDirent: PropTypes.func.isRequired,
  isAllItemSelected: PropTypes.bool.isRequired,
  onAllItemSelected: PropTypes.func.isRequired,
  selectedDirentList: PropTypes.array.isRequired,
  onItemsMove: PropTypes.func.isRequired,
  onItemsCopy: PropTypes.func.isRequired,
  onItemsDelete: PropTypes.func.isRequired,
  onFileTagChanged: PropTypes.func,
  showDirentDetail: PropTypes.func.isRequired,
  loadDirentList: PropTypes.func,
};

class DirListView extends React.Component {

  render() {

    if (this.props.path === '/' && this.props.direntList.length === 0) {
      return (
        <DirentNoneView
          path={this.props.path}
          isDirentListLoading={this.props.isDirentListLoading}
          onAddFile={this.props.onAddFile}
        />
      );
    }

    return (
      <Fragment>
        {this.props.isRepoInfoBarShow && (
          <RepoInfoBar
            repoID={this.props.repoID}
            currentPath={this.props.path}
            readmeMarkdown={this.props.readmeMarkdown}
            draftCounts={this.props.draftCounts}
            usedRepoTags={this.props.usedRepoTags}
            updateUsedRepoTags={this.props.updateUsedRepoTags}
            onFileTagChanged={this.props.onFileTagChanged}
          />
        )}
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
          onItemCopy={this.props.onItemCopy}
          onDirentClick={this.props.onDirentClick}
          isDirentListLoading={this.props.isDirentListLoading}
          updateDirent={this.props.updateDirent}
          isAllItemSelected={this.props.isAllItemSelected}
          onAllItemSelected={this.props.onAllItemSelected}
          selectedDirentList={this.props.selectedDirentList}
          onItemsMove={this.props.onItemsMove}
          onItemsCopy={this.props.onItemsCopy}
          onItemsDelete={this.props.onItemsDelete}
          onAddFile={this.props.onAddFile}
          onAddFolder={this.props.onAddFolder}
          onFileTagChanged={this.props.onFileTagChanged}
          showDirentDetail={this.props.showDirentDetail}
          loadDirentList={this.props.loadDirentList}
        />
      </Fragment>
    );
  }
}

DirListView.propTypes = propTypes;

export default DirListView;
