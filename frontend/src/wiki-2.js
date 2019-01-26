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
    // todo
  }
  
  onSearchedClick = (item) => {
    // todo
  }

  onMenuClick = () => {
    this.setState({closeSideBar: !this.state.closeSideBar,});
  }

  onMainNavBarClick = (path) => {
    // update location url
    let fileUrl = siteRoot + 'wikis/' + slug + path;
    window.history.pushState({urlPath: fileUrl, filePath: path}, path, fileUrl);
  }

  onDirentClick = (dirent) => {

  }

  onCloseSide = () => {
    this.setState({closeSideBar: !this.state.closeSideBar});
  }

  onNodeClick = (node) => {
    
  }

  onNodeExpanded = (node) => {

  }

  onNodeCollapse = (node) => {

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
