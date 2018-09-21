import React, { Component } from 'react';
import { gettext, repoID, serviceUrl, slug, siteRoot, isPro } from '../../components/constants';
import CommonToolbar from '../../components/toolbar/common-toolbar';
import PathToolbar from '../../components/toolbar/path-toolbar';
import MarkdownViewer from '../../components/markdown-viewer';
import TreeDirView from '../../components/tree-dir-view/tree-dir-view';

class MainPanel extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isWikiMode: true
    }
  }

  onMenuClick = () => {
    this.props.onMenuClick();
  }

  onEditClick = (e) => {
    // const w=window.open('about:blank')
    e.preventDefault();
    window.location.href= serviceUrl + '/lib/' + repoID + '/file' + this.props.filePath + '?mode=edit';
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

  render() {

    let filePathList = this.props.filePath.split('/');
    let nodePath = "";
    let pathElem = filePathList.map((item, index) => {
      if (item === "") {
        return;
      } 
      if (index === (filePathList.length - 1)) {
        return (
          <span key={index}><span className="path-split">/</span>{item}</span>
        )
      } else {
        nodePath += "/" + item;
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
        )
      }
    });

    return (
      <div className="main-panel wiki-main-panel o-hidden">
        <div className="main-panel-top panel-top">
          <div className="cur-view-toolbar border-left-show">
            <span className="sf2-icon-menu hidden-md-up d-md-none side-nav-toggle" title={gettext('Side Nav Menu')} onClick={this.onMenuClick}></span>
            { 
              this.props.permission === 'rw' && 
              <button className="btn btn-secondary top-toolbar-btn" title={gettext('Edit File')} onClick={this.onEditClick}>{gettext("Edit")}</button>
            }
            <div className="btn-group">
              <button className="btn btn-secondary btn-icon sf-view-mode-change-btn sf2-icon-list-view" id='list' title={gettext("List")} onClick={this.switchViewMode}></button>
              <button className="btn btn-secondary btn-icon sf-view-mode-change-btn sf2-icon-grid-view" id='grid' title={gettext("Grid")} onClick={this.switchViewMode}></button>
              <button className={`btn btn-secondary btn-icon sf-view-mode-change-btn sf2-icon-wiki-view ${this.state.isWikiMode ? 'current-mode' : ''}`} id='wiki' title={gettext("wiki")} onClick={this.switchViewMode}></button>
            </div>
          </div>
          <CommonToolbar onSearchedClick={this.props.onSearchedClick} />
        </div>
        <div className="cur-view-container">
          <div className="cur-view-path">
            <div className="path-containter">
              <a href={siteRoot + '#common/'} className="normal">{gettext("Libraries")}</a>
              <span className="path-split">/</span>
              <a href={siteRoot + 'wiki/lib/' + repoID + '/'} className="normal">{slug}</a>
              {pathElem}
            </div>
            <PathToolbar />
          </div>
          <div className="cur-view-content">
            { this.props.isViewFileState && 
              <MarkdownViewer
                markdownContent={this.props.content}
                latestContributor={this.props.latestContributor}
                lastModified = {this.props.lastModified}
                onLinkClick={this.props.onLinkClick}
                isFileLoading={this.props.isFileLoading}
              />
            }
            { !this.props.isViewFileState && 
              <TreeDirView 
                node={this.props.changedNode}
                onMainNodeClick={this.props.onMainNodeClick}
              >
              </TreeDirView>
            }
          </div>
        </div>
    </div>
    )
  }
}

export default MainPanel;
