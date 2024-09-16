import React from 'react';
import PropTypes from 'prop-types';
import TreeListView from './tree-list-view';
import TreeNode from '../../components/tree-view/tree-node';
import Dirent from '../../models/dirent';
import { seafileAPI } from '../../utils/seafile-api';
import treeHelper from '../../components/tree-view/tree-helper';
import { Utils } from '../../utils/utils';
import toaster from '../toast';

const propTypes = {
  isCurrentRepo: PropTypes.bool,
  currentPath: PropTypes.string,
  isShowFile: PropTypes.bool,
  selectedPath: PropTypes.string,
  selectedRepo: PropTypes.object,
  repo: PropTypes.object.isRequired,
  initToShowChildren: PropTypes.bool.isRequired,
  onDirentItemClick: PropTypes.func.isRequired,
  onRepoItemClick: PropTypes.func.isRequired,
  fileSuffixes: PropTypes.array,
  selectedItemInfo: PropTypes.object,
  hideLibraryName: PropTypes.bool,
  isBrowsing: PropTypes.bool,
  browsingPath: PropTypes.string,
};

class RepoListItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isShowChildren: this.props.initToShowChildren,
      treeData: treeHelper.buildTree(),
      hasLoaded: false,
      isMounted: false,
    };
  }

  componentDidMount() {
    console.log('mount');
    this.setState({ isMounted: true });
    const { isCurrentRepo, currentPath, repo, selectedItemInfo } = this.props;

    // render search result
    const { repoID, filePath } = selectedItemInfo || {};
    if (repoID && repoID === repo.repo_id) {
      this.loadRepoDirentList(repo);
      setTimeout(() => {
        this.setState({ isShowChildren: true });
        this.loadNodeAndParentsByPath(repoID, filePath);
      }, 0);
      return;
    }

    if (repo.repo_id === this.props.selectedRepo.repo_id || isCurrentRepo) {
      this.loadRepoDirentList(repo);
      setTimeout(() => {
        const repoID = repo.repo_id;
        if (isCurrentRepo && currentPath && currentPath != '/') {
          const expandNode = true;
          this.loadNodeAndParentsByPath(repoID, currentPath, expandNode);
        }
      }, 0);
    }
  }

  // componentDidUpdate(prevProps) {
  //   if (prevProps.isBrowsing !== this.props.isBrowsing) {
  //     this.setState({
  //       treeData: treeHelper.buildTree(),
  //       isShowChildren: this.props.initToShowChildren,
  //     });

  //     const { isCurrentRepo, currentPath, repo } = this.props;
  //     console.log('isCurrentRepo', isCurrentRepo);
  //     if (isCurrentRepo) {
  //       this.loadRepoDirentList(repo);
  //       setTimeout(() => {
  //         const repoID = repo.repo_id;
  //         if (isCurrentRepo && currentPath && currentPath != '/') {
  //           const expandNode = true;
  //           this.loadNodeAndParentsByPath(repoID, currentPath, expandNode);
  //         }
  //       }, 0);
  //     }
  //   }

  // }

  componentWillUnmount() {
    console.log('unmount');
    this.setState({ isMounted: false, hasLoaded: false });
  }

  loadRepoDirentList = async (repo) => {
    const { hasLoaded } = this.state;
    if (hasLoaded) return;
    const repoID = repo.repo_id;

    try {
      const res = await seafileAPI.listDir(repoID, '/');
      if (!this.state.isMounted) return;

      let tree = this.state.treeData.clone();
      let direntList = this.props.isShowFile ? res.data.dirent_list : res.data.dirent_list.filter(item => item.type === 'dir');

      this.addResponseListToNode(direntList, tree.root);
      this.setState({ treeData: tree, hasLoaded: true });
    } catch (error) {
      if (!this.state.isMounted) return;

      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    }
  };

  addResponseListToNode = (list, node) => {
    node.isLoaded = true;
    node.isExpanded = true;
    let direntList = list.map(item => {
      return new Dirent(item);
    });
    direntList = Utils.sortDirents(direntList, 'name', 'asc');

    let nodeList = direntList.map(object => {
      return new TreeNode({ object });
    });
    node.addChildren(nodeList);
  };

  onNodeExpanded = (node) => {
    let repoID = this.props.repo.repo_id;
    let tree = this.state.treeData.clone();
    node = tree.getNodeByPath(node.path);
    if (!node.isLoaded) {
      seafileAPI.listDir(repoID, node.path).then(res => {
        let direntList = [];
        if (this.props.isShowFile === true) {
          direntList = res.data.dirent_list;
        } else {
          direntList = res.data.dirent_list.filter(item => item.type === 'dir');
        }
        this.addResponseListToNode(direntList, node);
        this.setState({ treeData: tree });
      }).catch(error => {
        let errMessage = Utils.getErrorMsg(error);
        toaster.danger(errMessage);
      });
    } else {
      tree.expandNode(node);
      this.setState({ treeData: tree });
    }
  };

  onNodeCollapse = (node) => {
    let tree = treeHelper.collapseNode(this.state.treeData, node);
    this.setState({ treeData: tree });
  };

  loadNodeAndParentsByPath = (repoID, path, expandNode) => {

    let tree = this.state.treeData.clone();

    seafileAPI.listDir(repoID, path, { with_parents: true }).then(res => {
      let direntList = res.data.dirent_list;
      direntList = direntList.filter(item => item.type === 'dir');
      let results = {};
      for (let i = 0; i < direntList.length; i++) {
        let object = direntList[i];
        let parentDir = object.parent_dir;
        let key = parentDir === '/' ? '/' : parentDir.slice(0, parentDir.length - 1);
        if (!results[key]) {
          results[key] = [];
        }
        results[key].push(object);
      }
      for (let key in results) {
        let node = tree.getNodeByPath(key);
        if (!node.isLoaded) {
          this.addResponseListToNode(results[key], node);
        }
      }

      this.setState({
        treeData: tree
      }, () => {
        if (expandNode) {
          this.onNodeExpanded(tree.getNodeByPath(path));
        }
      });
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  onToggleClick = (e) => {
    e.stopPropagation();
    let repo = this.props.repo;
    this.loadRepoDirentList(repo);
    this.setState({ isShowChildren: !this.state.isShowChildren });
  };

  onDirentItemClick = (filePath, dirent) => {
    let repo = this.props.repo;
    this.props.onDirentItemClick(repo, filePath, dirent);
  };

  onRepoItemClick = (e) => {
    const { repo, selectedPath } = this.props;
    if (!this.isCurrentRepo() || (selectedPath !== '' && selectedPath !== '/')) {
      this.props.onRepoItemClick(repo);
    } else {
      this.onToggleClick(e);
    }
  };

  isCurrentRepo = () => {
    let { selectedRepo, repo } = this.props;
    return selectedRepo && (repo.repo_id === selectedRepo.repo_id);
  };

  render() {
    let repoActive = false;
    let isCurrentRepo = this.isCurrentRepo();
    if (isCurrentRepo && this.props.selectedPath == '/') {
      repoActive = true;
    }

    return (
      <li>
        {!this.props.hideLibraryName && !this.props.isBrowsing &&
          <div className={`${repoActive ? 'item-active' : ''} item-info`} onClick={this.onRepoItemClick}>
            <div className="item-left-icon">
              <span className={`item-toggle icon sf3-font ${this.state.isShowChildren ? 'sf3-font-down' : 'sf3-font-down rotate-270 d-inline-block'}`} onClick={this.onToggleClick}></span>
              <i className="tree-node-icon">
                <span className="icon sf3-font sf3-font-folder tree-node-icon"></span>
              </i>
            </div>
            <div className="item-text">
              <span className="name user-select-none ellipsis" title={this.props.repo.repo_name}>{this.props.repo.repo_name}</span>
            </div>
          </div>
        }
        {this.state.isShowChildren && (
          <TreeListView
            repo={this.props.repo}
            onDirentItemClick={this.onDirentItemClick}
            selectedRepo={this.props.selectedRepo}
            selectedPath={this.props.selectedPath}
            fileSuffixes={this.props.fileSuffixes}
            treeData={this.state.treeData}
            onNodeCollapse={this.onNodeCollapse}
            onNodeExpanded={this.onNodeExpanded}
            isBrowsing={this.props.isBrowsing}
            browsingPath={this.props.browsingPath}
          />
        )}
      </li>
    );
  }
}

RepoListItem.propTypes = propTypes;

export default RepoListItem;
