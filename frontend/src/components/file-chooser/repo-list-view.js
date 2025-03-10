import React from 'react';
import PropTypes from 'prop-types';
import RepoListItem from './repo-list-item';

const propTypes = {
  currentRepoInfo: PropTypes.object,
  isShowFile: PropTypes.bool,
  repo: PropTypes.object,
  repoList: PropTypes.array,
  selectedRepo: PropTypes.object,
  initToShowChildren: PropTypes.bool,
  selectedPath: PropTypes.string,
  onDirentItemClick: PropTypes.func.isRequired,
  onRepoItemClick: PropTypes.func.isRequired,
  fileSuffixes: PropTypes.array,
  selectedItemInfo: PropTypes.object,
  currentPath: PropTypes.string,
  selectedSearchedRepo: PropTypes.object,
  newFolderName: PropTypes.string,
};

class RepoListView extends React.Component {

  render() {
    let { currentRepoInfo = null, isShowFile = false, currentPath = '', repoList = [], selectedSearchedRepo, initToShowChildren, selectedItemInfo = null, fileSuffixes = [], selectedPath = '', selectedRepo = null } = this.props;
    if (currentRepoInfo) {
      repoList = [];
      repoList.push(currentRepoInfo);
    }

    if (selectedSearchedRepo) {
      repoList = [];
      repoList.push(selectedSearchedRepo);
    }

    return (
      <ul className="list-view-content file-chooser-item" >
        {repoList.length > 0 && repoList.map((repoItem, index) => {
          return (
            <RepoListItem
              key={repoItem.repo_id}
              isCurrentRepo={currentRepoInfo ? true : false}
              currentPath={currentPath}
              repo={repoItem}
              initToShowChildren={initToShowChildren}
              selectedRepo={selectedRepo}
              selectedPath={selectedPath}
              onRepoItemClick={this.props.onRepoItemClick}
              onDirentItemClick={this.props.onDirentItemClick}
              isShowFile={isShowFile}
              fileSuffixes={fileSuffixes}
              selectedItemInfo={selectedItemInfo}
              newFolderName={this.props.newFolderName}
            />
          );
        })}
      </ul>
    );
  }
}

RepoListView.propTypes = propTypes;

export default RepoListView;
