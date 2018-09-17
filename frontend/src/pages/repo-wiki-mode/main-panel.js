import React, { Component } from 'react';
import { gettext, repoID, serviceUrl, slug, siteRoot, isPro, permission } from '../../components/constants';
import Search from '../../components/search/search';
import Account from '../../components/account';
import Notification from '../../components/notification';
import MarkdownViewer from '../../components/markdown-viewer';
import TreeDirView from '../../components/tree-dir-view/tree-dir-view';

class MainPanel extends Component {

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
          <a key={index} className="custom-link" data-path={nodePath} onClick={this.onMainNavBarClick}><span className="path-split">/</span>{item}</a>
        )
      }
    });

    return (
      <div className="wiki-main-panel o-hidden">
        <div className="main-panel-top panel-top">
          <span className="sf2-icon-menu side-nav-toggle hidden-md-up d-md-none" title="Side Nav Menu" onClick={this.onMenuClick}></span>
           <div className="wiki-page-ops btn-group">
              { this.props.permission === 'rw' && 
                <button className="btn btn-secondary sf-toobar-btn-edit" title="Edit File" onClick={this.onEditClick}>{gettext("Edit")}</button>
              }
              <button className="btn btn-secondary sf-toolbar-btn sf2-icon-list-view" id='list' title={gettext("List")} onClick={this.switchViewMode}></button>
              <button className="btn btn-secondary sf-toolbar-btn sf2-icon-grid-view" id='grid' title={gettext("Grid")} onClick={this.switchViewMode}></button>
          </div>
          <div className="common-toolbar">
            {isPro && <Search  onSearchedClick={this.props.onSearchedClick}
                               placeholder={gettext("Search files in this library")}
                      />
            }
            <Notification />
            <Account  />
          </div>
        </div>
        <div className="cur-view-main">
          <div className="cur-view-path">
            <div className="path-containter">
              <a href={siteRoot + '#common/'} className="normal">{gettext("Libraries")}</a>
              <span className="path-split">/</span>
              <a href={siteRoot + 'wiki/lib/' + repoID + '/'} className="normal">{slug}</a>
              {pathElem}
            </div>
          </div>
          <div className="cur-view-container table-container">
            { this.props.isViewFileState && <MarkdownViewer
              markdownContent={this.props.content}
              latestContributor={this.props.latestContributor}
              lastModified = {this.props.lastModified}
              onLinkClick={this.props.onLinkClick}
              isFileLoading={this.props.isFileLoading}
            />}
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
