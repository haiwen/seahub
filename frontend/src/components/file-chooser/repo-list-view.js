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
  hideLibraryName: PropTypes.bool,
};

class RepoListView extends React.Component {

  render() {
    let { currentRepoInfo, currentPath, repoList } = this.props;
    if (currentRepoInfo) {
      repoList = [];
      repoList.push(currentRepoInfo);
    }
    let style = {};
    if (this.props.hideLibraryName) {
      style = { marginLeft: '-44px' };
    }
    return (
      <ul className="list-view-content file-chooser-item" style={style}>
        {repoList.length > 0 && repoList.map((repoItem, index) => {
          return (
            <RepoListItem
              key={index}
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
              hideLibraryName={this.props.hideLibraryName}
            />
          );
        })}
      </ul>
    );
  }
}

RepoListView.propTypes = propTypes;

export default RepoListView;
