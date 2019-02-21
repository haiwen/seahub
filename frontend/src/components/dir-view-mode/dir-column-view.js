import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import DirColumnNav from './dir-column-nav';
import DirColumnFile from './dir-column-file';
import DirListMode from './dir-list-view';

import '../../css/lib-content-view.css';

const propTypes = {
  path: PropTypes.string.isRequired,
  repoID: PropTypes.string.isRequired,
  // repoinfo
  currentRepoInfo: PropTypes.object.isRequired,
  repoPermission: PropTypes.bool.isRequired,
  repoEncrypted: PropTypes.bool.isRequired,
  enableDirPrivateShare: PropTypes.bool.isRequired,
  userPrem: PropTypes.bool,
  isAdmin: PropTypes.bool.isRequired,
  isRepoOwner: PropTypes.bool.isRequired,
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
  isDraft: PropTypes.bool.isRequired,
  hasDraft: PropTypes.bool.isRequired,
  goDraftPage: PropTypes.func.isRequired,
  reviewStatus: PropTypes.string,
  goReviewPage: PropTypes.func.isRequired,
  filePermission: PropTypes.bool.isRequired,
  content: PropTypes.string,
  lastModified: PropTypes.string,
  latestContributor: PropTypes.string,
  onLinkClick: PropTypes.func.isRequired,
  // repo content
  isRepoInfoBarShow: PropTypes.bool.isRequired,
  draftCounts: PropTypes.number.isRequired,
  reviewCounts: PropTypes.number.isRequired,
  usedRepoTags: PropTypes.array.isRequired,
  readmeMarkdown: PropTypes.object,
  updateUsedRepoTags: PropTypes.func.isRequired,
  // list
  isDirentListLoading: PropTypes.bool.isRequired,
  direntList: PropTypes.array.isRequired,
  sortBy: PropTypes.string.isRequired,
  sortOrder: PropTypes.string.isRequired,
  sortItems: PropTypes.func.isRequired,
  onAddFile: PropTypes.func.isRequired,
  updateDirent: PropTypes.func.isRequired,
  onItemClick: PropTypes.func.isRequired,
  onItemSelected: PropTypes.func.isRequired,
  onItemDelete: PropTypes.func.isRequired,
  onItemRename: PropTypes.func.isRequired,
  onItemMove: PropTypes.func.isRequired,
  onItemCopy: PropTypes.func.isRequired,
  onItemDetails: PropTypes.func.isRequired,
  onDirentClick: PropTypes.func.isRequired,
  isAllItemSelected: PropTypes.bool.isRequired,
  onAllItemSelected: PropTypes.func.isRequired,
};

class DirColumnView extends React.Component {

  render() {
    return (
      <Fragment>
        <DirColumnNav 
          currentPath={this.props.path}
          repoPermission={this.props.repoPermission}
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
        />
        <div className="dir-content-main">
          {this.props.isViewFile ? (
            <DirColumnFile 
              path={this.props.path}
              repoID={this.props.repoID}
              hash={this.props.hash}
              isDraft={this.props.isDraft}
              hasDraft={this.props.hasDraft}
              goDraftPage={this.props.goDraftPage}
              reviewStatus={this.props.reviewStatus}
              goReviewPage={this.props.goReviewPage}
              isFileLoading={this.props.isFileLoading}
              isFileLoadedErr={this.props.isFileLoadedErr}
              filePermission={this.props.filePermission}
              content={this.props.content}
              lastModified={this.props.lastModified}
              latestContributor={this.props.latestContributor}
              onLinkClick={this.props.onLinkClick}
            />
          ) : (
            <DirListMode 
              path={this.props.path}
              repoID={this.props.repoID}
              currentRepoInfo={this.props.currentRepoInfo}
              repoEncrypted={this.props.repoEncrypted}
              isRepoOwner={this.props.isRepoOwner}
              isAdmin={this.props.isAdmin}
              isGroupOwnedRepo={this.props.isGroupOwnedRepo}
              enableDirPrivateShare={this.props.enableDirPrivateShare}
              isRepoInfoBarShow={this.props.isRepoInfoBarShow}
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
              onItemClick={this.props.onItemClick}
              onItemSelected={this.props.onItemSelected}
              onItemDelete={this.props.onItemDelete}
              onItemRename={this.props.onItemRename}
              onItemMove={this.props.onItemMove}
              onItemCopy={this.props.onItemCopy}
              onDirentClick={this.props.onDirentClick}
              onItemDetails={this.props.onItemDetails}
              updateDirent={this.props.updateDirent}
              isAllItemSelected={this.props.isAllItemSelected}
              onAllItemSelected={this.props.onAllItemSelected}
            />
          )}
        </div>
      </Fragment>
    );
  }
}

DirColumnView.propTypes = propTypes;

export default DirColumnView;
