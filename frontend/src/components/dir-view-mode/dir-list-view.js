import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import RepoInfoBar from '../../components/repo-info-bar';
import DirentListView from '../../components/dirent-list-view/dirent-list-view';

const propTypes = {
  path: PropTypes.string.isRequired,
  repoID: PropTypes.string.isRequired,
  currentRepoInfo: PropTypes.object.isRequired,
  repoEncrypted: PropTypes.bool.isRequired,
  isRepoOwner: PropTypes.bool.isRequired,
  isAdmin: PropTypes.bool.isRequired,
  isGroupOwnedRepo: PropTypes.bool.isRequired,
  enableDirPrivateShare: PropTypes.bool.isRequired,
  isRepoInfoBarShow: PropTypes.bool.isRequired,
  usedRepoTags: PropTypes.array.isRequired,
  readmeMarkdown: PropTypes.object,
  draftCounts: PropTypes.number,
  reviewCounts: PropTypes.number,
  updateUsedRepoTags: PropTypes.func.isRequired,
  isDirentListLoading: PropTypes.bool.isRequired,
  direntList: PropTypes.array.isRequired,
  sortBy: PropTypes.string.isRequired,
  sortOrder: PropTypes.string.isRequired,
  sortItems: PropTypes.func.isRequired,
  onAddFile: PropTypes.func.isRequired,
  onItemClick: PropTypes.func.isRequired,
  onItemSelected: PropTypes.func.isRequired,
  onItemDelete: PropTypes.func.isRequired,
  onItemRename: PropTypes.func.isRequired,
  onItemMove: PropTypes.func.isRequired,
  onItemCopy: PropTypes.func.isRequired,
  onDirentClick: PropTypes.func.isRequired,
  onItemDetails: PropTypes.func.isRequired,
  updateDirent: PropTypes.func.isRequired,
  isAllItemSelected: PropTypes.bool.isRequired,
  onAllItemSelected: PropTypes.func.isRequired,
};

class DirListView extends React.Component {

  render() {
    return (
      <Fragment>
        {this.props.isRepoInfoBarShow && (
          <RepoInfoBar 
            repoID={this.props.repoID}
            currentPath={this.props.path}
            readmeMarkdown={this.props.readmeMarkdown}
            draftCounts={this.props.draftCounts}
            reviewCounts={this.props.reviewCounts}
            usedRepoTags={this.props.usedRepoTags}
            updateUsedRepoTags={this.props.updateUsedRepoTags}
          />
        )}
        <DirentListView
          path={this.props.path}
          currentRepoInfo={this.props.currentRepoInfo}
          repoID={this.props.repoID}
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
          onItemClick={this.props.onItemClick}
          onItemSelected={this.props.onItemSelected}
          onItemDelete={this.props.onItemDelete}
          onItemRename={this.props.onItemRename}
          onItemMove={this.props.onItemMove}
          onItemCopy={this.props.onItemCopy}
          onDirentClick={this.props.onDirentClick}
          onItemDetails={this.props.onItemDetails}
          isDirentListLoading={this.props.isDirentListLoading}
          updateDirent={this.props.updateDirent}
          isAllItemSelected={this.props.isAllItemSelected}
          onAllItemSelected={this.props.onAllItemSelected}
        />
      </Fragment>
    );
  }
}

DirListView.propTypes = propTypes;

export default DirListView;
