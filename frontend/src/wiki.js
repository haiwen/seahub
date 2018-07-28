import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import SidePanel from './components/SidePanel';
import MainPanel from './components/MainPanel';
import moment from 'moment';
import './assets/css/fa-solid.css';
import './assets/css/fa-regular.css';
import './assets/css/fontawesome.css';
import './css/initial-style.css';
import './css/richeditor/side-panel.css';
import './css/wiki.css';

const slug = window.wiki.config.slug;
const repoID = window.wiki.config.repoId;
const siteRoot = window.app.config.siteRoot;
const serviceUrl = window.wiki.config.serviceUrl;
const dirPath = '/';

class EditorUtilities {
  getFiles() {
    const dirUrl = siteRoot + 'api/v2.1/wikis/' + slug + '/pages/dir/';
    return fetch(dirUrl, {credentials: 'same-origin'})
      .then(res => res.json())
      .then(items => {
        const files = items.dir_file_list.map(item => {
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
      fileName: 'home.md',
      latestContributor: '',
      lastModified: '',
    };
    window.onpopstate = this.onpopstate;
  }

  componentDidMount() {
    this.loadFile("home.md", "/home.md");

  }

  isInternalWikiLink(url) {
    var re = new RegExp(serviceUrl + '/wikis/'+ slug + "/.*\.md");
    return re.test(url);
  }

  getWikiLink(url) {
    var re = new RegExp(serviceUrl + '/wikis/'+ slug + "/(.*\.md)");
    var array = re.exec(url);
    var path = decodeURIComponent(array[1]);
    return path;
  }

  onLinkClick = (event) => {
    const url = event.target.href;
    if (this.isInternalWikiLink(url)) {
      let path = this.getWikiLink(url);
      this.loadFile(path);
    }
  }

  onFileClick = (e, node) => {
    if (node.isMarkdown()) {
      this.setState({
        fileName: node.name,
      })
      if (node.parent_path === '/') {
        this.loadFile(node.name)
      } else {
        this.loadFile(node.path)
      }
    }
  }

  loadFile(filePath) {
    const path = encodeURIComponent(filePath);
    const url = siteRoot + 'api/v2.1/wikis/' + slug + '/content/' + '?p=/' + filePath;
    fetch(url, {credentials: 'same-origin'})
      .then(res => res.json())
      .then(res => {
        this.setState({
          content: res.content,
          latestContributor: res.latest_contributor,
          lastModified:moment.unix(res.last_modified).fromNow(),
        })
      })



    let fileUrl = '/wikis/' + slug + '/' + filePath;
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
      <div id="main">
        <SidePanel
          onFileClick={this.onFileClick}
          closeSideBar={this.state.closeSideBar}
          onCloseSide ={this.onCloseSide}
          editorUtilities={editorUtilities}
        />
        <MainPanel
          content={this.state.content}
          fileName={this.state.fileName}
          onLinkClick={this.onLinkClick}
          onMenuClick={this.onMenuClick}
          latestContributor={this.state.latestContributor}
          lastModified={this.state.lastModified}
        />
      </div>
    )
  }
}

ReactDOM.render (
  <Wiki />,
  document.getElementById('wrapper')
)
