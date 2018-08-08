import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import SidePanel from './components/SidePanel';
import MainPanel from './components/MainPanel';
import moment from 'moment';
import cookie from 'react-cookies';
import { SeafileAPI } from 'seafile-js';
import { slug, repoID, serviceUrl, initialFilePath, siteRoot } from './components/constance';
import './assets/css/fa-solid.css';
import './assets/css/fa-regular.css';
import './assets/css/fontawesome.css';
import 'seafile-ui';
import './css/side-panel.css';
import './css/wiki.css';

// init seafileAPI
let seafileAPI = new SeafileAPI();
let xcsrfHeaders = cookie.load('csrftoken');
seafileAPI.initForSeahubUsage({ siteRoot, xcsrfHeaders });

class EditorUtilities {
  getFiles() {
    return seafileAPI.listWikiDir(slug).then(items => {
        const files = items.data.dir_file_list.map(item => {
          return {
            name: item.name,
            type: item.type === 'dir' ? 'dir' : 'file',
            isExpanded: item.type === 'dir' ? true : false,
            parent_path: item.parent_dir,
          }
        })
        return files;
      })
  }
}

const editorUtilities = new EditorUtilities();

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
      permission: ''
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
    var re = new RegExp(serviceUrl + '/lib/' + repoID + '/file' + '.*\.md');
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
    }
  }

  onFileClick = (e, node) => {
    if (node.isMarkdown()) {
      this.loadFile(node.path);
    }
  }

  loadFile(filePath) {
    seafileAPI.getWikiFileContent(slug, filePath)
      .then(res => {
        this.setState({
          content: res.data.content,
          latestContributor: res.data.latest_contributor,
          lastModified: moment.unix(res.data.last_modified).fromNow(),
          permission: res.data.permission,
          fileName: this.fileNameFromPath(filePath),
          filePath: filePath
        })
      })

      let fileUrl = '/wikis/' + slug + filePath;
      window.history.pushState({urlPath: fileUrl, filePath: filePath}, filePath, fileUrl);
  }

  onpopstate = (event) => {
    this.loadFile(event.state.filePath);
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
          editorUtilities={editorUtilities}
        />
        <MainPanel
          content={this.state.content}
          fileName={this.state.fileName}
          filePath={this.state.filePath}
          onLinkClick={this.onLinkClick}
          onMenuClick={this.onMenuClick}
          latestContributor={this.state.latestContributor}
          lastModified={this.state.lastModified}
          seafileAPI={seafileAPI}
          permission={this.state.permission}
        />
      </div>
    )
  }
}

ReactDOM.render (
  <Wiki />,
  document.getElementById('wrapper')
)
