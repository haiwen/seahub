import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { gettext, repoID, serviceUrl, slug, siteRoot } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import CommonToolbar from '../../components/toolbar/common-toolbar';
import PathToolbar from '../../components/toolbar/path-toolbar';
import MarkdownViewer from '../../components/markdown-viewer';
import DirentListView from '../../components/dirent-list-view/dirent-list-view';
import Dirent from '../../models/dirent';

const propTypes = {
  content: PropTypes.string,
  lastModified: PropTypes.string,
  latestContributor: PropTypes.string,
  permission: PropTypes.string,
  filePath: PropTypes.string.isRequired,
  isFileLoading: PropTypes.bool.isRequired,
  isViewFileState: PropTypes.bool.isRequired,
  onMenuClick: PropTypes.func.isRequired,
  onSearchedClick: PropTypes.func.isRequired,
  onMainNavBarClick: PropTypes.func.isRequired,
  onMainItemClick: PropTypes.func.isRequired,
  onMainItemDelete: PropTypes.func.isRequired,
}

class MainPanel extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isWikiMode: true,
      direntList: []
    };
  }

  componentWillReceiveProps(nextProps) {
    let node = nextProps.changedNode;
    if (node && node.isDir()) {
      let path = node.path;
      this.updateViewList(path);
    }
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
            { 
              this.props.permission === 'rw' && 
              <button className="btn btn-secondary top-toolbar-btn" title={gettext('Edit File')} onClick={this.onEditClick}>{gettext('Edit')}</button>
            }
            <div className="btn-group">
              <button className="btn btn-secondary btn-icon sf-view-mode-change-btn sf2-icon-list-view" id='list' title={gettext('List')} onClick={this.switchViewMode}></button>
              <button className="btn btn-secondary btn-icon sf-view-mode-change-btn sf2-icon-grid-view" id='grid' title={gettext('Grid')} onClick={this.switchViewMode}></button>
              <button className={`btn btn-secondary btn-icon sf-view-mode-change-btn sf2-icon-wiki-view ${this.state.isWikiMode ? 'current-mode' : ''}`} id='wiki' title={gettext('wiki')} onClick={this.switchViewMode}></button>
            </div>
          </div>
          <CommonToolbar onSearchedClick={this.props.onSearchedClick} searchPlaceholder={'Search files in this library'}/>
        </div>
        <div className="cur-view-container">
          <div className="cur-view-path">
            <div className="path-containter">
              <a href={siteRoot + '#common/'} className="normal">{gettext('Libraries')}</a>
              <span className="path-split">/</span>
              <a href={siteRoot + 'wiki/lib/' + repoID + '/'} className="normal">{slug}</a>
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
      </div>
    );
  }
}

MainPanel.propTypes = propTypes;

export default MainPanel;
