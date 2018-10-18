import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { gettext, repoID, serviceUrl, slug, siteRoot } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import Dirent from '../../models/dirent';
import CommonToolbar from '../../components/toolbar/common-toolbar';
import PathToolbar from '../../components/toolbar/path-toolbar';
import MarkdownViewer from '../../components/markdown-viewer';
import DirentListView from '../../components/dirent-list-view/dirent-list-view';
import CreateFolder from '../../components/dialog/create-folder-dialog';
import CreateFile from '../../components/dialog/create-file-dialog';

const propTypes = {
  content: PropTypes.string,
  lastModified: PropTypes.string,
  latestContributor: PropTypes.string,
  permission: PropTypes.string,
  filePath: PropTypes.string.isRequired,
  isFileLoading: PropTypes.bool.isRequired,
  isViewFileState: PropTypes.bool.isRequired,
  changedNode: PropTypes.object,
  onMenuClick: PropTypes.func.isRequired,
  onSearchedClick: PropTypes.func.isRequired,
  onMainNavBarClick: PropTypes.func.isRequired,
  onLinkClick: PropTypes.func.isRequired,
  onMainItemClick: PropTypes.func.isRequired,
  onMainItemDelete: PropTypes.func.isRequired,
  onMainAddFile: PropTypes.func.isRequired,
  onMainAddFolder: PropTypes.func.isRequired,
  switchViewMode: PropTypes.func.isRequired,
};

class MainPanel extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isWikiMode: true,
      direntList: [],
      newMenuShow: false,
      uploadMenuShow: false,
      showFileDialog: false,
      showFolderDialog: false,
      createFileType: '',
    };
  }

  componentDidMount() {
    document.addEventListener('click', this.hideOperationMenu);
  }

  componentWillReceiveProps(nextProps) {
    let node = nextProps.changedNode;
    if (node && node.isDir()) {
      let path = node.path;
      this.updateViewList(path);
    }
  }

  componentWillUnmount() {
    document.removeEventListener('click', this.hideOperationMenu);
  }

  updateViewList = (filePath) => {
    seafileAPI.listDir(repoID, filePath, 48).then(res => {
      let direntList = [];
      res.data.forEach(item => {
        let dirent = new Dirent(item);
        direntList.push(dirent);
      });
      this.setState({
        direntList: direntList,
      });
    });
  }

  onMenuClick = () => {
    this.props.onMenuClick();
  }

  onMainNavBarClick = (e) => {
    this.props.onMainNavBarClick(e.target.dataset.path);
  }

  switchViewMode = (e) => {
    e.preventDefault();
    if (e.target.id === 'wiki') {
      return;
    }
    this.setState({isWikiMode: false});
    this.props.switchViewMode(e.target.id);
  }

  onEditClick = (e) => {
    e.preventDefault();
    window.location.href= serviceUrl + '/lib/' + repoID + '/file' + this.props.filePath + '?mode=edit';
  }

  onUploadClick = (e) => {
    this.toggleOperationMenu(e);
    this.setState({
      newMenuShow: false,
      uploadMenuShow: !this.state.uploadMenuShow,
    });
  }

  onNewClick = (e) => {
    this.toggleOperationMenu(e);
    this.setState({
      newMenuShow: !this.state.newMenuShow,
      uploadMenuShow: false,
    });
  }

  onShareClick = () => {
    alert('share btn clicked');
  }

  toggleOperationMenu = (e) => {
    e.nativeEvent.stopImmediatePropagation();
    let targetRect = e.target.getClientRects()[0];
    let left = targetRect.x;
    let top  = targetRect.y + targetRect.height;
    let style = {position: 'fixed', display: 'block', left: left, top: top};
    this.setState({operationMenuStyle: style});
  }

  hideOperationMenu = () => {
    this.setState({
      uploadMenuShow: false,
      newMenuShow: false,
    });
  }

  addFolder = () => {
    this.setState({showFolderDialog: !this.showFolderDialog});
  }

  addFile = () => {
    this.setState({
      showFileDialog: !this.showFileDialog,
      createFileType: '',
    });
  }

  addMarkdownFile = () => {
    this.setState({
      showFileDialog: !this.showFileDialog,
      createFileType: '.md',
    });
  }

  addFolderCancel = () => {
    this.setState({showFolderDialog: !this.state.showFolderDialog});
  }

  addFileCancel = () => {
    this.setState({showFileDialog: !this.state.showFileDialog});
  }

  onMainAddFile = (filePath, isDraft) => {
    this.setState({showFileDialog: !this.state.showFileDialog});
    this.props.onMainAddFile(filePath, isDraft);
  }

  onMainAddFolder = (dirPath) => {
    this.setState({showFolderDialog: !this.state.showFolderDialog});
    this.props.onMainAddFolder(dirPath);
  }

  render() {
    let filePathList = this.props.filePath.split('/');
    let nodePath = '';
    let pathElem = filePathList.map((item, index) => {
      if (item === '') {
        return;
      } 
      if (index === (filePathList.length - 1)) {
        return (
          <span key={index}><span className="path-split">/</span>{item}</span>
        );
      } else {
        nodePath += '/' + item;
        return (
          <span key={index} >
            <span className="path-split">/</span>
            <a 
              className="path-link" 
              data-path={nodePath} 
              onClick={this.onMainNavBarClick}>
              {item}
            </a>
          </span>
        );
      }
    });

    return (
      <div className="main-panel wiki-main-panel o-hidden">
        <div className="main-panel-top panel-top">
          <div className="cur-view-toolbar border-left-show">
            <span className="sf2-icon-menu hidden-md-up d-md-none side-nav-toggle" title={gettext('Side Nav Menu')} onClick={this.onMenuClick}></span>
            <div className="file-operation">
              <div className="operation">
                { 
                  this.props.permission === 'rw' &&
                  <button className="btn btn-secondary operation-item" title={gettext('Edit File')} onClick={this.onEditClick}>{gettext('Edit')}</button>
                }
                <button className="btn btn-secondary operation-item" title={gettext('Edit File')} onClick={this.onUploadClick}>{gettext('Upload')}</button>
                <button className="btn btn-secondary operation-item" title={gettext('Edit File')} onClick={this.onNewClick}>{gettext('New')}</button>
                <button className="btn btn-secondary operation-item" title={gettext('Edit File')} onClick={this.onShareClick}>{gettext('Share')}</button>
              </div>
              {
                this.state.uploadMenuShow && 
                <ul className="menu dropdown-menu" style={this.state.operationMenuStyle}>
                  <li className="dropdown-item">{gettext('Upload Files')}</li>
                  <li className="dropdown-item">{gettext('Upload Folder')}</li>
                </ul>
              }
              {
                this.state.newMenuShow &&
                <ul className="menu dropdown-menu" style={this.state.operationMenuStyle}>
                  <li className="dropdown-item" onClick={this.addFolder}>{gettext('New Folder')}</li>
                  <li className="dropdown-item" onClick={this.addFile}>{gettext('New File')}</li>
                  <li className="dropdown-item menu-inner-divider"></li>
                  <li className="dropdown-item" onClick={this.addMarkdownFile}>{gettext('New Markdown File')}</li>
                </ul>
              }
            </div>
            <div className="view-mode btn-group">
              <button className="btn btn-secondary btn-icon sf-view-mode-btn sf2-icon-list-view" id='list' title={gettext('List')} onClick={this.switchViewMode}></button>
              <button className="btn btn-secondary btn-icon sf-view-mode-btn sf2-icon-grid-view" id='grid' title={gettext('Grid')} onClick={this.switchViewMode}></button>
              <button className={`btn btn-secondary btn-icon sf-view-mode-btn sf2-icon-two-columns ${this.state.isWikiMode ? 'current-mode' : ''}`} id='wiki' title={gettext('wiki')} onClick={this.switchViewMode}></button>
            </div>
          </div>
          <CommonToolbar onSearchedClick={this.props.onSearchedClick} searchPlaceholder={'Search files in this library'}/>
        </div>
        <div className="cur-view-container">
          <div className="cur-view-path">
            <div className="path-containter">
              <a href={siteRoot + '#common/'} className="normal">{gettext('Libraries')}</a>
              <span className="path-split">/</span>
              {this.props.filePath === '/' ?
                <span>{slug}</span> :
                <a className="path-link" data-path="/" onClick={this.onMainNavBarClick}>{slug}</a>
              }
              {pathElem}
            </div>
            <PathToolbar filePath={this.props.filePath}/>
          </div>
          <div className="cur-view-content">
            { this.props.isViewFileState ?
              <MarkdownViewer
                markdownContent={this.props.content}
                latestContributor={this.props.latestContributor}
                lastModified = {this.props.lastModified}
                onLinkClick={this.props.onLinkClick}
                isFileLoading={this.props.isFileLoading}
              /> :
              <DirentListView 
                direntList={this.state.direntList}
                filePath={this.props.filePath}
                onItemClick={this.props.onMainItemClick}
                onItemDelete={this.props.onMainItemDelete}
                updateViewList={this.updateViewList}
              />
            }
          </div>
        </div>
        {this.state.showFileDialog && 
          <CreateFile
            fileType={this.state.createFileType}
            parentPath={this.props.filePath}
            addFileCancel={this.addFileCancel}
            onAddFile={this.onMainAddFile}
          />
        }
        {this.state.showFolderDialog &&
          <CreateFolder 
            parentPath={this.props.filePath}
            addFolderCancel={this.addFolderCancel}
            onAddFolder={this.onMainAddFolder}
          />
        }
      </div>
    );
  }
}

MainPanel.propTypes = propTypes;

export default MainPanel;
