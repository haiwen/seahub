import React, { Component } from 'react';
import Search from './search';
import MarkdownViewer from './markdown-viewer';
import Account from './account';
import { gettext, repoID, serviceUrl, slug, siteRoot } from './constance';

class MainPanel extends Component {

  onMenuClick = () => {
    this.props.onMenuClick();
  }

  onEditClick = (e) => {
    // const w=window.open('about:blank')
    e.preventDefault();
    window.location.href= serviceUrl + '/lib/' + repoID + '/file' + this.props.filePath + '?mode=edit';
  }

  render() {
    var filePathList = this.props.filePath.split('/');
    var pathElem = filePathList.map((item, index) => {
      if (item == "") {
        return;
      } else {
        return (
          <span key={index}><span className="path-split">/</span>{item}</span>
        )
      }
    });

    return (
      <div className="wiki-main-panel o-hidden">
        <div className="main-panel-top panel-top">
          <span className="sf2-icon-menu side-nav-toggle hidden-md-up d-md-none" title="Side Nav Menu" onClick={this.onMenuClick}></span>
           <div className={`wiki-page-ops ${this.props.permission === 'rw' ? '' : 'hide'}`}>
              <a className="btn btn-secondary btn-topbar" onClick={this.onEditClick}>{gettext("Edit Page")}</a>
           </div>
          <div className="common-toolbar">
            <Search seafileAPI={this.props.seafileAPI} onSearchedClick={this.props.onSearchedClick}/>
            <Account seafileAPI={this.props.seafileAPI} />
          </div>
        </div>
        <div className="cur-view-main">
          <div className="cur-view-path">
            <div className="path-containter">
              <a href={siteRoot + 'wikis/'} className="normal">{gettext("Wikis")}</a>
              <span className="path-split">/</span>
              <a href={siteRoot + 'wikis/' + slug} className="normal">{slug}</a>
              {pathElem}
            </div>
          </div>
          <div className="cur-view-container">
            <MarkdownViewer
              markdownContent={this.props.content}
              latestContributor={this.props.latestContributor}
              lastModified = {this.props.lastModified}
              onLinkClick={this.props.onLinkClick}
              isFileLoading={this.props.isFileLoading}
            />
          </div>
        </div>
    </div>
    )
  }
}

export default MainPanel;
