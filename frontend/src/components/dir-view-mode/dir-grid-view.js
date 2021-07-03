import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import RepoInfoBar from '../../components/repo-info-bar';
import DirentGridView from '../../components/dirent-grid-view/dirent-grid-view';
import DirentNoneView from '../../components/dirent-list-view/dirent-none-view';

const propTypes = {
  path: PropTypes.string.isRequired,
  repoID: PropTypes.string.isRequired,
  currentRepoInfo: PropTypes.object.isRequired,
  readmeMarkdown: PropTypes.object,
  draftCounts: PropTypes.number,
  usedRepoTags: PropTypes.array.isRequired,
  updateUsedRepoTags: PropTypes.func.isRequired,
  direntList: PropTypes.array.isRequired,
  onItemClick: PropTypes.func.isRequired,
  onGridItemClick: PropTypes.func,
  onAddFile: PropTypes.func.isRequired,
  onItemDelete: PropTypes.func.isRequired,
  onItemMove: PropTypes.func.isRequired,
  onItemCopy: PropTypes.func.isRequired,
  onRenameNode: PropTypes.func.isRequired,
  isGroupOwnedRepo: PropTypes.bool.isRequired,
  userPerm: PropTypes.string,
  isRepoInfoBarShow: PropTypes.bool.isRequired,
  isDirentListLoading: PropTypes.bool.isRequired,
  isDirentDetailShow: PropTypes.bool.isRequired,
  enableDirPrivateShare: PropTypes.bool.isRequired,
  updateDirent: PropTypes.func.isRequired,
  showDirentDetail: PropTypes.func.isRequired,
  onAddFolder: PropTypes.func.isRequired,
  onFileTagChanged: PropTypes.func,
  onItemRename: PropTypes.func.isRequired,
};

class DirGridView extends React.Component {

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
        <DirentGridView
          path={this.props.path}
          repoID={this.props.repoID}
          currentRepoInfo={this.props.currentRepoInfo}
          isGroupOwnedRepo={this.props.isGroupOwnedRepo}
          userPerm={this.props.userPerm}
          enableDirPrivateShare={this.props.enableDirPrivateShare}
          direntList={this.props.direntList}
          fullDirentList={this.props.fullDirentList}
          onAddFile={this.props.onAddFile}
          onItemClick={this.props.onItemClick}
          onItemDelete={this.props.onItemDelete}
          onItemMove={this.props.onItemMove}
          onItemCopy={this.props.onItemCopy}
          isDirentListLoading={this.props.isDirentListLoading}
          updateDirent={this.props.updateDirent}
          onRenameNode={this.props.onRenameNode}
          showDirentDetail={this.props.showDirentDetail}
          onGridItemClick={this.props.onGridItemClick}
          isDirentDetailShow={this.props.isDirentDetailShow}
          onItemRename={this.props.onItemRename}
          onAddFolder={this.props.onAddFolder}
          onFileTagChanged={this.props.onFileTagChanged}
        />
      </Fragment>
    );
  }
}

DirGridView.propTypes = propTypes;

export default DirGridView;
