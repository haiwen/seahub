import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import moment from 'moment';
import { slug, repoID, siteRoot, initialPath, isDir } from './utils/constants';
import { Utils } from './utils/utils';
import { seafileAPI } from './utils/seafile-api';
import Dirent from './models/dirent';
import TreeNode from './components/tree-view-2/tree-node';
import treeHelper from './components/tree-view-2/tree-helper';
import SidePanel from './pages/wiki-2/side-panel';
import MainPanel from './pages/wiki-2/main-panel';

import './assets/css/fa-solid.css';
import './assets/css/fa-regular.css';
import './assets/css/fontawesome.css';
import './css/layout.css';
import './css/side-panel.css';
import './css/wiki.css';
import './css/toolbar.css';
import './css/search.css';


class Wiki extends Component {
  constructor(props) {
    super(props);
    this.state = {
      path: '',
      pathExist: true,
      closeSideBar: false,
      isViewFile: true,
      isDataLoading: true,
      direntList: [],
      content: '',
      permission: '',
      lastModified: '',
      latestContributor: '',
      isTreeDataLoading: true,
      treeData: treeHelper.buildTree(),
      currentNode: null,
    };

    window.onpopstate = this.onpopstate;
    this.indexPath = '/index.md';
    this.homePath = '/home.md';
  }

  componentDidMount() {
    this.loadWikiData(initialPath);
  }

  loadWikiData = () => {  
    this.loadSidePanel(initialPath);

    if (isDir === 'None') {
      this.setState({pathExist: false});
    } else if (isDir === 'True') {  
      this.showDir(initialPath);
    } else if (isDir === 'False') {
      this.showFile(initialPath);
    }
  }

  loadSidePanel = (initialPath) => {
    if (initialPath === '/' || isDir === 'None') {
      seafileAPI.listDir(repoID, '/').then(res => {
        let tree = this.state.treeData;
        this.addResponseListToNode(res.data.dirent_list, tree.root);
        this.setState({
          treeData: tree,
          isTreeDataLoading: false,
        });
      }).catch(() => {
        this.setState({isLoadFailed: true});
      });
    } else {
      this.loadNodeAndParentsByPath(initialPath);
    }
  }

  showDir = (dirPath) => {
    this.loadDirentList(dirPath);

    // update location url
    let fileUrl = siteRoot + 'wikis/' + slug + dirPath;
    window.history.pushState({urlPath: fileUrl, filePath: dirPath}, dirPath, fileUrl);
  }

  showFile = (filePath) => {

    this.setState({
      isDataLoading: true,
      isViewFile: true,
      path: filePath, 
    });

    seafileAPI.getFileInfo(repoID, filePath).then(res => {
      let { mtime, permission, last_modifier_name } = res.data;
      seafileAPI.getFileDownloadLink(repoID, filePath).then(res => {
        seafileAPI.getFileContent(res.data).then(res => {
          this.setState({
            isDataLoading: false,
            content: res.data,
            permission: permission,
            lastModified: moment.unix(mtime).fromNow(),
            latestContributor: last_modifier_name,
          });
        });
      });
    });

    const hash = window.location.hash;
    let fileUrl = siteRoot + 'wikis/' + slug + filePath + hash;
    window.history.pushState({urlPath: fileUrl, filePath: filePath}, filePath, fileUrl);
  }

  loadDirentList = (dirPath) => {
    this.setState({isDataLoading: true});
    seafileAPI.listDir(repoID, dirPath).then(res => {
      let direntList = res.data.dirent_list.map(item => {
        let dirent = new Dirent(item);
        return dirent;
      });
      direntList = Utils.sortDirents(direntList, 'name', 'asc');
      this.setState({
        path: dirPath,
        isViewFile: false,
        direntList: direntList,
        isDataLoading: false,
      });
    }).catch(() => {
      this.setState({isLoadFailed: true})
    });
  }

  loadTreeNodeByPath = (path) => {
    let tree = this.state.treeData.clone();
    let node = tree.getNodeByPath(path);
    if (!node.isLoaded) {
      seafileAPI.listDir(repoID, node.path).then(res => {
        this.addResponseListToNode(res.data.dirent_list, node);
        let parentNode = tree.getNodeByPath(node.parentNode.path);
        parentNode.isExpanded = true;
        this.setState({
          treeData: tree,
          currentNode: node
        });
      })
    } else {
      let parentNode = tree.getNodeByPath(node.parentNode.path);
      parentNode.isExpanded = true;
      this.setState({treeData: tree, currentNode: node}); //tree
    }
  }

  loadNodeAndParentsByPath = (path) => {
    let tree = this.state.treeData.clone();
    if (Utils.isMarkdownFile(path)) {
      path = Utils.getDirName(path);
    }
    seafileAPI.listDir(repoID, path, {with_parents: true}).then(res => {
      let direntList = res.data.dirent_list;
      let results = {};
      for (let i = 0; i < direntList.length; i++) {
        let object = direntList[i];
        let key = object.parent_dir;
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
        isTreeDataLoading: false,
        treeData: tree
      });
    }).catch(() => {
      this.setState({isLoadFailed: true});
    });
  }

  onLinkClick = (link) => {
    const url = link;
    if (Utils.isWikiInternalMarkdownLink(url, slug)) {
      let path = Utils.getPathFromWikiInternalMarkdownLink(url, slug);
      this.initMainPanelData(path);
    } else if (Utils.isWikiInternalDirLink(url, slug)) {
      let path = Utils.getPathFromWikiInternalDirLink(url, slug);
      this.initWikiData(path);
    } else {
      window.location.href = url;
    }
  }

  onpopstate = (event) => {
    if (event.state && event.state.path) {
      let path = event.state.path;
      if (Utils.isMarkdownFile(path)) {
        this.showFile(path);
      } else {
        this.loadDirentList(path);
        this.setState({
          path: path,
          isViewFile: false
        });
      }
    }
  }
  
  onSearchedClick = (item) => {
    let path = item.is_dir ? item.path.slice(0, item.path.length - 1) : item.path; 
    if (this.state.currentPath === path) {
      return;
    }

    // load sidePanel
    let index = -1;
    let paths = Utils.getPaths(path);
    for (let i = 0; i < paths.length; i++) {
      let node = this.state.treeData.getNodeByPath(node);
      if (!node) {
        index = i;
        break;
      } 
    }
    if (index === -1) { // all the data has been loaded already.
      let node = this.state.treeData.getNodeByPath(path);
      this.setState({currentNode: node});
    } else {
      this.loadNodeAndParentsByPath(path);
    }

    // load mainPanel
    if (item.is_dir) {
      this.showDir(path);
    } else {
      if (Utils.isMarkdownFile(path)) {
        this.showFile(path);
      } else {
        let url = siteRoot + 'lib/' + item.repo_id + '/file' + Utils.encodePath(path);
        let newWindow = window.open('about:blank');
        newWindow.location.href = url;
      }
    }
  }

  onMenuClick = () => {
    this.setState({closeSideBar: !this.state.closeSideBar,});
  }

  onMainNavBarClick = (nodePath) => {
    let tree = this.state.treeData.clone();
    let node = tree.getNodeByPath(nodePath);
    tree.expandNode(node);

    this.setState({treeData: tree, currentNode: node});
    this.showDir(node.path);
  }

  onDirentClick = (dirent) => {
    let direntPath = Utils.joinPath(this.state.path, dirent.name);
    if (dirent.isDir()) {  // is dir
      this.loadTreeNodeByPath(direntPath);
      this.showDir(direntPath);
    } else {  // is file
      if (Utils.isMarkdownFile(direntPath)) {
        this.showFile(direntPath);
      } else {
        const w=window.open('about:blank');
        const url = siteRoot + 'lib/' + repoID + '/file' + Utils.encodePath(direntPath);
        w.location.href = url;
      }
    }
  }

  onCloseSide = () => {
    this.setState({closeSideBar: !this.state.closeSideBar});
  }

  onNodeClick = (node) => {
    if (!this.state.pathExist) {
      this.setState({pathExist: true});
    }

    if (node.object.isDir()) {
      if (!node.isLoaded) {
        let tree = this.state.treeData.clone();
        node = tree.getNodeByPath(node.path);
        seafileAPI.listDir(repoID, node.path).then(res => {
          this.addResponseListToNode(res.data.dirent_list, node);
          tree.collapseNode(node);
          this.setState({treeData: tree});
        });
      }
      if (node.path === this.state.path) {
        if (node.isExpanded) {
          let tree = treeHelper.collapseNode(this.state.treeData, node);
          this.setState({treeData: tree});
        } else {
          let tree = this.state.treeData.clone();
          node = tree.getNodeByPath(node.path);
          tree.expandNode(node);
          this.setState({treeData: tree});
        }
      }
    }

    if (node.path === this.state.path ) {
      return;
    }

    if (node.object.isDir()) {  // isDir
      this.showDir(node.path);
    } else {
      if (Utils.isMarkdownFile(node.path)) {
        if (node.path !== this.state.path) {
          this.showFile(node.path);
        }
      } else {
        const w = window.open('about:blank');
        const url = siteRoot + 'lib/' + repoID + '/file' + node.path;
        w.location.href = url;
      }
    }
  }

  onNodeCollapse = (node) => {
    let tree = treeHelper.collapseNode(this.state.treeData, node);
    this.setState({treeData: tree});
  }

  onNodeExpanded = (node) => {
    let tree = this.state.treeData.clone();
    node = tree.getNodeByPath(node.path);
    if (!node.isLoaded) {
      seafileAPI.listDir(repoID, node.path).then(res => {
        this.addResponseListToNode(res.data.dirent_list, node);
        this.setState({treeData: tree});
      });
    } else {
      tree.expandNode(node);
      this.setState({treeData: tree});
    }
  }

  addResponseListToNode = (list, node) => {
    node.isLoaded = true;
    node.isExpanded = true;
    let direntList = list.map(item => {
      return new Dirent(item);
    });
    direntList = Utils.sortDirents(direntList, 'name', 'asc');

    let nodeList = direntList.map(object => {
      return new TreeNode({object});
    });
    node.addChildren(nodeList);
  }

  render() {
    return (
      <div id="main" className="wiki-main">
        <SidePanel
          isTreeDataLoading={this.state.isTreeDataLoading}
          closeSideBar={this.state.closeSideBar}
          currentPath={this.state.path}
          treeData={this.state.treeData}
          indexNode={this.state.indexNode}
          currentNode={this.state.currentNode}
          onCloseSide={this.onCloseSide}
          onNodeClick={this.onNodeClick}
          onNodeCollapse={this.onNodeCollapse}
          onNodeExpanded={this.onNodeExpanded}
        />
        <MainPanel
          path={this.state.path}
          pathExist={this.state.pathExist}
          isViewFile={this.state.isViewFile}
          isDataLoading={this.state.isDataLoading}
          content={this.state.content}
          permission={this.state.permission}
          lastModified={this.state.lastModified}
          latestContributor={this.state.latestContributor}
          direntList={this.state.direntList}
          onLinkClick={this.onLinkClick}
          onMenuClick={this.onMenuClick}
          onSearchedClick={this.onSearchedClick}
          onMainNavBarClick={this.onMainNavBarClick}
          onDirentClick={this.onDirentClick}
        />
      </div>
    );
  }
}

ReactDOM.render (
  <Wiki />,
  document.getElementById('wrapper')
);
