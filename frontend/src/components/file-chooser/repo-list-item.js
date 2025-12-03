import React from 'react';
import PropTypes from 'prop-types';
import TreeListView from './tree-list-view';
import TreeNode from '../../components/tree-view/tree-node';
import treeHelper from '../../components/tree-view/tree-helper';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import Dirent from '../../models/dirent';
import toaster from '../toast';
import Icon from '../icon';

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
  newFolderName: PropTypes.string,
};

class RepoListItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isShowChildren: this.props.initToShowChildren,
      treeData: treeHelper.buildTree(),
      hasLoaded: false,
    };
    this.loadRepoTimer = null;
    this.isComponentMounted = false;
  }

  componentDidMount() {
    this.isComponentMounted = true;
    const { isCurrentRepo, currentPath, repo, selectedItemInfo } = this.props;

    // render search result
    const { repoID, filePath } = selectedItemInfo || {};
    if (repoID && repoID === repo.repo_id) {
      this.loadRepoDirentList(repo);
      this.loadRepoTimer = setTimeout(() => {
        if (this.isComponentMounted) {
          this.setState({ isShowChildren: true });
          this.loadNodeAndParentsByPath(repoID, filePath);
        }
      }, 0);
      return;
    }

    if (this.props.selectedRepo && repo && repo.repo_id === this.props.selectedRepo.repo_id || isCurrentRepo) {
      this.loadRepoDirentList(repo);
      this.loadRepoTimer = setTimeout(() => {
        const repoID = repo.repo_id;
        if (isCurrentRepo && currentPath && currentPath != '/') {
          const expandNode = true;
          this.loadNodeAndParentsByPath(repoID, currentPath, expandNode);
        }
      }, 0);
    }
  }

  componentDidUpdate(prevProps) {
    const { repo, selectedRepo, selectedPath, newFolderName } = this.props;
    let parentPath;
    if (selectedPath == '/' + newFolderName) {
      parentPath = '/';
    } else {
      const pathElements = selectedPath.split('/');
      pathElements.pop();
      parentPath = pathElements.join('/');
    }
    // create new folder in selected repo or folder
    if (!this.isComponentMounted || !repo || !selectedRepo) return;
    const isSameRepo = repo.repo_id === selectedRepo.repo_id;
    const isNewlySelectedRepo = !prevProps.selectedRepo || prevProps.selectedRepo.repo_id !== selectedRepo.repo_id;
    if (isSameRepo && isNewlySelectedRepo) {
      seafileAPI.listDir(repo.repo_id, parentPath).then(res => {
        const { dirent_list = [], dir_id = '', user_perm = 'r' } = res?.data || {};
        const dirent = dirent_list.find(item => item.type === 'dir' && item.name === newFolderName);
        const direntData = dirent || new Dirent({ name: newFolderName, tye: 'dir', id: dir_id, permission: user_perm });
        const object = new Dirent(direntData);
        const direntNode = new TreeNode({ object });
        const newTreeData = treeHelper.addNodeToParentByPath(this.state.treeData, direntNode, parentPath);
        this.setState({ treeData: newTreeData });
      }).catch(error => {
        if (!this.isComponentMounted) return;
        const errMessage = Utils.getErrorMsg(error);
        toaster.danger(errMessage);
      });
    }
  }

  componentWillUnmount() {
    this.isComponentMounted = false;
    this.clearLoadRepoTimer();
    this.setState({ hasLoaded: false });
  }

  clearLoadRepoTimer = () => {
    if (!this.loadRepoTimer) return;
    clearTimeout(this.loadRepoTimer);
    this.loadRepoTimer = null;
  };

  loadRepoDirentList = async (repo) => {
    const { hasLoaded } = this.state;
    if (hasLoaded) return;
    const repoID = repo.repo_id;

    try {
      const res = await seafileAPI.listDir(repoID, '/');
      if (!this.isComponentMounted) return;

      let tree = this.state.treeData.clone();
      let direntList = this.props.isShowFile ? res.data.dirent_list : res.data.dirent_list.filter(item => item.type === 'dir');

      this.addResponseListToNode(direntList, tree.root);
      this.setState({ treeData: tree, hasLoaded: true });
    } catch (error) {
      if (!this.isComponentMounted) return;

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
    if (!this.isCurrentRepo() || (selectedPath !== '/')) {
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
    const { repo } = this.props;
    let repoActive = false;
    let isCurrentRepo = this.isCurrentRepo();
    if (isCurrentRepo && this.props.selectedPath == '/') {
      repoActive = true;
    }

    return (
      <li>
        <div
          className={`${repoActive ? 'item-active' : ''} item-info`}
          onClick={this.onRepoItemClick}
          tabIndex={0}
          role="treeitem"
          aria-selected={repoActive}
          onKeyDown={Utils.onKeyDown}
        >
          <div className="item-left-icon">
            <span className="d-flex justify-content-center align-items-center item-toggle tree-node-icon icon" onClick={this.onToggleClick}>
              <Icon symbol="down" className={this.state.isShowChildren ? '' : 'rotate-270'} />
            </span>
            <span className="tree-node-icon icon">
              <Icon symbol="folder" />
            </span>
          </div>
          <div className="item-text">
            <span className="name user-select-none ellipsis" title={repo.repo_name}>{repo.repo_name}</span>
          </div>
          {repoActive &&
            <div className="item-right-icon">
              <Icon symbol="check" />
            </div>
          }
        </div>
        {this.state.isShowChildren && (
          <TreeListView
            repo={repo}
            onDirentItemClick={this.onDirentItemClick}
            selectedRepo={this.props.selectedRepo}
            selectedPath={this.props.selectedPath}
            fileSuffixes={this.props.fileSuffixes}
            treeData={this.state.treeData}
            onNodeCollapse={this.onNodeCollapse}
            onNodeExpanded={this.onNodeExpanded}
          />
        )}
      </li>
    );
  }
}

RepoListItem.propTypes = propTypes;

export default RepoListItem;
