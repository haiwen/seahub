import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import RepoInfoBar from '../../components/repo-info-bar';
import DirentGridView from '../../components/dirent-grid-view/dirent-grid-view';

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
};

class DirGridView extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isRepoInfoBarShow: true
    }
    
  }

  render() {
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
          />
        )}
        <DirentGridView
          path={this.props.path}
          currentRepoInfo={this.props.currentRepoInfo}
          repoID={this.props.repoID}
          isGroupOwnedRepo={this.props.isGroupOwnedRepo}
          enableDirPrivateShare={this.props.enableDirPrivateShare}
          direntList={this.props.direntList}
          onAddFile={this.props.onAddFile}
          onItemClick={this.props.onItemClick}
          // onItemSelected={this.props.onItemSelected}
          onItemDelete={this.props.onItemDelete}
          // onItemRename={this.props.onItemRename}
          onItemMove={this.props.onItemMove}
          onItemCopy={this.props.onItemCopy}
          // onDirentClick={this.props.onDirentClick}
          isDirentListLoading={this.props.isDirentListLoading}
          updateDirent={this.props.updateDirent}
          // isAllItemSelected={this.props.isAllItemSelected}
          // onAllItemSelected={this.props.onAllItemSelected}
          showShareBtn={this.props.showShareBtn}
          onRenameNode={this.props.onRenameNode}
          showDirentDetail={this.props.showDirentDetail}
          onGridItemClick={this.props.onGridItemClick}
          isDirentDetailShow={this.props.isDirentDetailShow}

        />
      </Fragment>
    );
  }
}

DirGridView.propTypes = propTypes;

export default DirGridView;
