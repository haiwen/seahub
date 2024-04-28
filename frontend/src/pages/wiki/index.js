import React, { Component } from 'react';
import moment from 'moment';
import MediaQuery from 'react-responsive';
import { Modal } from 'reactstrap';
import { Utils } from '../../utils/utils';
import wikiAPI from '../../utils/wiki-api';
import { slug, siteRoot, initialPath, isDir, sharedToken, hasIndex, lang, isEditWiki } from '../../utils/constants';
import Dirent from '../../models/dirent';
import WikiConfig from './models/wiki-config';
import TreeNode from '../../components/tree-view/tree-node';
import treeHelper from '../../components/tree-view/tree-helper';
import toaster from '../../components/toast';
import SidePanel from './side-panel';
import MainPanel from './main-panel';
import WikiLeftBar from './wiki-left-bar/wiki-left-bar';
import PageUtils from './view-structure/page-utils';

import '../../css/layout.css';
import '../../css/side-panel.css';
import '../../css/toolbar.css';
import '../../css/search.css';
import './wiki.css';

moment.locale(lang);

class Wiki extends Component {
  constructor(props) {
    super(props);
    this.state = {
      path: '',
      pathExist: true,
      closeSideBar: false,
      isViewFile: true,
      isDataLoading: false,
      direntList: [],
      content: '',
      permission: '',
      lastModified: '',
      latestContributor: '',
      isTreeDataLoading: true,
      isConfigLoading: true,
      treeData: treeHelper.buildTree(),
      currentNode: null,
      indexNode: null,
      indexContent: '',
      currentPageId: '',
      config: {},
      repoId: '',
    };

    window.onpopstate = this.onpopstate;
    this.indexPath = '/index.md';
    this.homePath = '/home.md';
    this.pythonWrapper = null;
  }

  UNSAFE_componentWillMount() {
    if (!Utils.isDesktop()) {
      this.setState({ closeSideBar: true });
    }
  }

  componentDidMount() {
    this.getWikiConfig();
    this.loadSidePanel(initialPath);
    this.loadWikiData(initialPath);

    this.links = document.querySelectorAll('#wiki-file-content a');
    this.links.forEach(link => link.addEventListener('click', this.onConentLinkClick));
  }

  componentWillUnmount() {
    this.links.forEach(link => link.removeEventListener('click', this.onConentLinkClick));
  }

  handlePath = () => {
    return isEditWiki ? 'edit-wiki/' : 'published/';
  };

  getWikiConfig = () => {
    wikiAPI.getWikiConfig(slug).then(res => {
      const { wiki_config, repo_id } = res.data.wiki;
      this.setState({
        config: new WikiConfig(JSON.parse(wiki_config) || {}),
        isConfigLoading: false,
        repoId: repo_id,
      });
    }).catch((error) => {
      let errorMsg = Utils.getErrorMsg(error);
      toaster.danger(errorMsg);
      this.setState({
        isConfigLoading: false,
      });
    });
  };

  saveWikiConfig = (wikiConfig, onSuccess, onError) => {
    wikiAPI.updateWikiConfig(slug, JSON.stringify(wikiConfig)).then(res => {
      this.setState({
        config: new WikiConfig(wikiConfig || {}),
      });
      onSuccess && onSuccess();
    }).catch((error) => {
      let errorMsg = Utils.getErrorMsg(error);
      toaster.danger(errorMsg);
      onError && onError();
    });
  };

  loadSidePanel = (initialPath) => {
    if (hasIndex) {
      this.loadIndexNode();
      return;
    }

    // load dir list
    initialPath = (isDir === 'None' || Utils.isSdocFile(initialPath)) ? '/' : initialPath;
    this.loadNodeAndParentsByPath(initialPath);
  };

  loadWikiData = (initialPath) => {
    this.pythonWrapper = document.getElementById('wiki-file-content');
    if (isDir === 'False' && Utils.isSdocFile(initialPath)) {
      this.showDir('/');
      return;
    }

    if (isDir === 'False') {
      // this.showFile(initialPath);
      this.setState({path: initialPath});
      return;
    }

    // if it is a file list, remove the template content provided by python
    this.removePythonWrapper();

    if (isDir === 'True') {
      this.showDir(initialPath);
      return;
    }

    if (isDir === 'None' && initialPath === '/home.md') {
      this.showDir('/');
      return;
    }

    if (isDir === 'None') {
      this.setState({pathExist: false});
      let fileUrl = siteRoot + this.handlePath() + slug + Utils.encodePath(initialPath);
      window.history.pushState({url: fileUrl, path: initialPath}, initialPath, fileUrl);
    }
  };

  loadIndexNode = () => {
    wikiAPI.listWikiDir(slug, '/').then(res => {
      let tree = this.state.treeData;
      this.addFirstResponseListToNode(res.data.dirent_list, tree.root);
      let indexNode = tree.getNodeByPath(this.indexPath);
      wikiAPI.getWikiFileContent(slug, indexNode.path).then(res => {
        this.setState({
          treeData: tree,
          indexNode: indexNode,
          indexContent: res.data.content,
          isTreeDataLoading: false,
        });
      });
    }).catch(() => {
      this.setState({isLoadFailed: true});
    });
  };

  showDir = (dirPath) => {
    this.removePythonWrapper();
    this.loadDirentList(dirPath);

    // update location url
    let fileUrl = siteRoot + this.handlePath() + slug + Utils.encodePath(dirPath);
    window.history.pushState({url: fileUrl, path: dirPath}, dirPath, fileUrl);
  };

  showFile = (filePath) => {
    this.setState({
      isDataLoading: true,
      isViewFile: true,
      path: filePath,
    });

    this.removePythonWrapper();
    wikiAPI.getWikiFileContent(slug, filePath).then(res => {
      let data = res.data;
      this.setState({
        isDataLoading: false,
        content: data.content,
        permission: data.permission,
        lastModified: moment.unix(data.last_modified).fromNow(),
        latestContributor: data.latest_contributor,
      });
    }).catch(error => {
      let errorMsg = Utils.getErrorMsg(error);
      toaster.danger(errorMsg);
    });

    const hash = window.location.hash;
    let fileUrl = `${siteRoot}${this.handlePath()}${slug}${Utils.encodePath(filePath)}${hash}`;
    if (filePath === '/home.md') {
      window.history.replaceState({url: fileUrl, path: filePath}, filePath, fileUrl);
    } else {
      window.history.pushState({url: fileUrl, path: filePath}, filePath, fileUrl);
    }
  };

  loadDirentList = (dirPath) => {
    this.setState({isDataLoading: true});
    wikiAPI.listWikiDir(slug, dirPath).then(res => {
      let direntList = res.data.dirent_list.map(item => {
        let dirent = new Dirent(item);
        return dirent;
      });
      if (dirPath === '/') {
        direntList = direntList.filter(item => {
          if (item.type === 'dir') {
            let name = item.name.toLowerCase();
            return name !== 'drafts' && name !== 'images' && name !== 'downloads';
          }
          return true;
        });
      }
      direntList = Utils.sortDirents(direntList, 'name', 'asc');
      this.setState({
        path: dirPath,
        isViewFile: false,
        direntList: direntList,
        isDataLoading: false,
      });
    }).catch(() => {
      this.setState({isLoadFailed: true});
    });
  };

  loadTreeNodeByPath = (path) => {
    let tree = this.state.treeData.clone();
    let node = tree.getNodeByPath(path);
    if (!node.isLoaded) {
      wikiAPI.listWikiDir(slug, node.path).then(res => {
        this.addResponseListToNode(res.data.dirent_list, node);
        let parentNode = tree.getNodeByPath(node.parentNode.path);
        parentNode.isExpanded = true;
        this.setState({
          treeData: tree,
          currentNode: node
        });
      });
    } else {
      let parentNode = tree.getNodeByPath(node.parentNode.path);
      parentNode.isExpanded = true;
      this.setState({treeData: tree, currentNode: node}); //tree
    }
  };

  loadNodeAndParentsByPath = (path) => {
    let tree = this.state.treeData.clone();
    if (Utils.isMarkdownFile(path)) {
      path = Utils.getDirName(path);
    }
    wikiAPI.listWikiDir(slug, path, true).then(res => {
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
        if (!node.isLoaded && node.path === '/') {
          this.addFirstResponseListToNode(results[key], node);
        } else if (!node.isLoaded) {
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
  };

  removePythonWrapper = () => {
    if (this.pythonWrapper)  {
      document.body.removeChild(this.pythonWrapper);
      this.pythonWrapper = null;
    }
  };

  onConentLinkClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    let link = '';
    if (event.target.tagName !== 'A') {
      let target = event.target.parentNode;
      while (target.tagName !== 'A') {
        target = target.parentNode;
      }
      link = target.href;
    } else {
      link = event.target.href;
    }
    this.onLinkClick(link);
  };

  onLinkClick = (link) => {
    const url = link;
    if (Utils.isWikiInternalMarkdownLink(url, slug)) {
      let path = Utils.getPathFromWikiInternalMarkdownLink(url, slug);
      this.showFile(path);
    } else if (Utils.isWikiInternalDirLink(url, slug)) {
      let path = Utils.getPathFromWikiInternalDirLink(url, slug);
      this.showDir(path);
    } else {
      window.location.href = url;
    }
    if (!this.state.closeSideBar) {
      this.setState({ closeSideBar: true });
    }
  };

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
  };

  onSearchedClick = (item) => {
    let path = item.is_dir ? item.path.slice(0, item.path.length - 1) : item.path;
    if (this.state.currentPath === path) {
      return;
    }

    // load sidePanel
    let index = -1;
    let paths = Utils.getPaths(path);
    for (let i = 0; i < paths.length; i++) {
      // eslint-disable-next-line no-use-before-define
      let node = this.state.treeData.getNodeByPath(node);
      if (!node) {
        index = i;
        break;
      }
    }
    if (index === -1) { // all the data has been loaded already.
      let tree = this.state.treeData.clone();
      let node = tree.getNodeByPath(item.path);
      treeHelper.expandNode(node);
      this.setState({treeData: tree});
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
        let url = siteRoot + 'd/' + sharedToken + '/files/?p=' + Utils.encodePath(path);
        let newWindow = window.open('about:blank');
        newWindow.location.href = url;
      }
    }
  };

  onMenuClick = () => {
    this.setState({closeSideBar: !this.state.closeSideBar});
  };

  onMainNavBarClick = (nodePath) => {
    let tree = this.state.treeData.clone();
    let node = tree.getNodeByPath(nodePath);
    tree.expandNode(node);
    this.setState({treeData: tree, currentNode: node});
    this.showDir(node.path);
  };

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
        const url = siteRoot + 'd/' + sharedToken + '/files/?p=' + Utils.encodePath(direntPath);
        w.location.href = url;
      }
    }
  };

  onCloseSide = () => {
    this.setState({closeSideBar: !this.state.closeSideBar});
  };

  onNodeClick = (node) => {
    if (!this.state.pathExist) {
      this.setState({pathExist: true});
    }

    if (node.object.isDir()) {
      if (!node.isLoaded) {
        let tree = this.state.treeData.clone();
        node = tree.getNodeByPath(node.path);
        wikiAPI.listWikiDir(slug, node.path).then(res => {
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
      if (Utils.isMarkdownFile(node.path) || Utils.isSdocFile(node.path)) {
        if (node.path !== this.state.path) {
          this.showFile(node.path);
        }
        this.onCloseSide();
      } else {
        const w = window.open('about:blank');
        const url = siteRoot + 'd/' + sharedToken + '/files/?p=' + Utils.encodePath(node.path);
        w.location.href = url;
      }
    }
  };

  onNodeCollapse = (node) => {
    let tree = treeHelper.collapseNode(this.state.treeData, node);
    this.setState({treeData: tree});
  };

  onNodeExpanded = (node) => {
    let tree = this.state.treeData.clone();
    node = tree.getNodeByPath(node.path);
    if (!node.isLoaded) {
      wikiAPI.listWikiDir(slug, node.path).then(res => {
        this.addResponseListToNode(res.data.dirent_list, node);
        this.setState({treeData: tree});
      });
    } else {
      tree.expandNode(node);
      this.setState({treeData: tree});
    }
  };

  addFirstResponseListToNode = (list, node) => {
    node.isLoaded = true;
    node.isExpanded = true;
    let direntList = list.map(item => {
      return new Dirent(item);
    });
    direntList = direntList.filter(item => {
      if (item.type === 'dir') {
        let name = item.name.toLowerCase();
        return name !== 'drafts' && name !== 'images' && name !== 'downloads';
      }
      return true;
    });
    direntList = Utils.sortDirents(direntList, 'name', 'asc');

    let nodeList = direntList.map(object => {
      return new TreeNode({object});
    });
    node.addChildren(nodeList);
  };

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
  };

  setCurrentPage = (pageId, callback) => {
    const { currentPageId, config } = this.state;
    if (pageId === currentPageId) {
      callback && callback();
      return;
    }
    const { pages } = config;
    const currentPage = PageUtils.getPageById(pages, pageId);
    const path = currentPage.path;
    if (Utils.isMarkdownFile(path) || Utils.isSdocFile(path)) {
      if (path !== this.state.path) {
        this.showFile(path);
      }
      this.onCloseSide();
    } else {
      const w = window.open('about:blank');
      const url = siteRoot + 'd/' + sharedToken + '/files/?p=' + Utils.encodePath(path);
      w.location.href = url;
    }
    this.setState({
      currentPageId: pageId,
      path: path,
    }, () => {
      callback && callback();
    });
  };

  render() {
    return (
      <div id="main" className="wiki-main">
        {isEditWiki &&
          <WikiLeftBar
            config={this.state.config}
            repoId={this.state.repoId}
            updateConfig={(data) => this.saveWikiConfig(Object.assign({}, this.state.config, data))}
          />
        }
        <SidePanel
          isLoading={this.state.isTreeDataLoading || this.state.isConfigLoading}
          closeSideBar={this.state.closeSideBar}
          currentPath={this.state.path}
          treeData={this.state.treeData}
          indexNode={this.state.indexNode}
          indexContent={this.state.indexContent}
          onCloseSide={this.onCloseSide}
          onNodeClick={this.onNodeClick}
          onNodeCollapse={this.onNodeCollapse}
          onNodeExpanded={this.onNodeExpanded}
          onLinkClick={this.onLinkClick}
          config={this.state.config}
          saveWikiConfig={this.saveWikiConfig}
          setCurrentPage={this.setCurrentPage}
          currentPageId={this.state.currentPageId}
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
        <MediaQuery query="(max-width: 767.8px)">
          <Modal isOpen={!this.state.closeSideBar} toggle={this.onCloseSide} contentClassName="d-none"></Modal>
        </MediaQuery>
      </div>
    );
  }
}

export default Wiki;
