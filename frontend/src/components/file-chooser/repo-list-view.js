import React from 'react';
import PropTypes from 'prop-types';
import RepoListItem from './repo-list-item';

const propTypes = {
  currentRepoInfo: PropTypes.object,
  isShowFile: PropTypes.bool,
  repo: PropTypes.object,
  repoList: PropTypes.array,
  selectedRepo: PropTypes.object,
  initToShowChildren: PropTypes.bool.isRequired,
  selectedPath: PropTypes.string,
  onDirentItemClick: PropTypes.func.isRequired,
  onRepoItemClick: PropTypes.func.isRequired,
  fileSuffixes: PropTypes.array,
  selectedItemInfo: PropTypes.object,
  currentPath: PropTypes.string,
  selectedSearchedRepo: PropTypes.object,
};

const defaultProps = {
  currentRepoInfo: null,
  isShowFile: false,
  repo: null,
  repoList: [],
  selectedRepo: null,
  selectedPath: '',
  fileSuffixes: [],
  selectedItemInfo: null,
  currentPath: '',
};

class RepoListView extends React.Component {

  render() {
    let { currentRepoInfo, currentPath, repoList, selectedSearchedRepo } = this.props;
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
              initToShowChildren={this.props.initToShowChildren}
              selectedRepo={this.props.selectedRepo}
              selectedPath={this.props.selectedPath}
              onRepoItemClick={this.props.onRepoItemClick}
              onDirentItemClick={this.props.onDirentItemClick}
              isShowFile={this.props.isShowFile}
              fileSuffixes={this.props.fileSuffixes}
              selectedItemInfo={this.props.selectedItemInfo}
            />
          );
        })}
      </ul>
    );
  }
}

RepoListView.propTypes = propTypes;
RepoListView.defaultProps = defaultProps;

export default RepoListView;
