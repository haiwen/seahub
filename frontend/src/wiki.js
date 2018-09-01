import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import SidePanel from './components/side-panel';
import MainPanel from './components/main-panel';
import moment from 'moment';
import { slug, repoID, serviceUrl, initialFilePath } from './components/constance';
import editorUtilities from './utils/editor-utilties';
import './assets/css/fa-solid.css';
import './assets/css/fa-regular.css';
import './assets/css/fontawesome.css';
import 'seafile-ui';
import './css/side-panel.css';
import './css/wiki.css';
import './css/search.css';

class Wiki extends Component {
  constructor(props) {
    super(props);
    this.state = {
      content: '',
      closeSideBar: false,
      fileName: '',
      filePath: '',
      latestContributor: '',
      lastModified: '',
      permission: '',
      isFileLoading: false,
      searchedPath: null,
    };
    window.onpopstate = this.onpopstate;
  }

  componentDidMount() {
    this.loadFile(initialFilePath);
  }

  fileNameFromPath(filePath) {
    let index = filePath.lastIndexOf("/");
    if (index == -1) {
      return "";
    } else {
      return filePath.substring(index + 1);
    }
  }

  isInternalMarkdownLink(url) {
    var re = new RegExp(serviceUrl + '/lib/' + repoID + '/file' + '.*\.md$');
    return re.test(url);
  }

  getPathFromInternalMarkdownLink(url) {
    var re = new RegExp(serviceUrl + '/lib/' + repoID + '/file' + "(.*\.md)");
    var array = re.exec(url);
    var path = decodeURIComponent(array[1]);
    return path;
  }

  onLinkClick = (event) => {
    const url = event.target.href;
    if (this.isInternalMarkdownLink(url)) {
      let path = this.getPathFromInternalMarkdownLink(url);
      this.loadFile(path);
    } else {
      window.location.href = url;
    }
  }

  onSearchedClick = (path) => {
    if (this.state.currentFilePath !== path) {
      this.setState({searchedPath : path});
    }
  }

  onFileClick = (e, node) => {
    if (node.isMarkdown()) {
      this.loadFile(node.path);
    } else {
      const w=window.open('about:blank');
      const url = serviceUrl + '/lib/' + repoID + '/file' + node.path;
      w.location.href = url;
    }
  }

  loadFile(filePath) {
    this.setState({isFileLoading: true});
    editorUtilities.getWikiFileContent(slug, filePath)
      .then(res => {
        this.setState({
          content: res.data.content,
          latestContributor: res.data.latest_contributor,
          lastModified: moment.unix(res.data.last_modified).fromNow(),
          permission: res.data.permission,
          fileName: this.fileNameFromPath(filePath),
          filePath: filePath,
          isFileLoading: false,
        })
      })

     const hash = window.location.hash;
     let fileUrl = serviceUrl + '/wikis/' + slug + filePath + hash;
     window.history.pushState({urlPath: fileUrl, filePath: filePath}, filePath, fileUrl);
  }

  onpopstate = (event) => {
    if (event.state && event.state.filePath) {
      this.loadFile(event.state.filePath);
    }
  }

  onMenuClick = () => {
    this.setState({
      closeSideBar: !this.state.closeSideBar,
    })
  }

  onCloseSide = () => {
    this.setState({
      closeSideBar: !this.state.closeSideBar,
    })
  }

  render() {
    return (
      <div id="main" className="wiki-main">
        <SidePanel
          onFileClick={this.onFileClick}
          closeSideBar={this.state.closeSideBar}
          onCloseSide ={this.onCloseSide}
          permission={this.state.permission}
          currentFilePath={this.state.filePath}
          searchedPath={this.state.searchedPath}
        />
        <MainPanel
          content={this.state.content}
          fileName={this.state.fileName}
          filePath={this.state.filePath}
          onLinkClick={this.onLinkClick}
          onMenuClick={this.onMenuClick}
          onSearchedClick={this.onSearchedClick}
          latestContributor={this.state.latestContributor}
          lastModified={this.state.lastModified}
          permission={this.state.permission}
          isFileLoading={this.state.isFileLoading}
        />
      </div>
    )
  }
}

ReactDOM.render (
  <Wiki />,
  document.getElementById('wrapper')
)
