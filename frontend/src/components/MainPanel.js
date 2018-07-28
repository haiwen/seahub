import React, { Component } from 'react';
import Search from './search';
import MarkdownViewer from './markdown-viewer';
import Account from './account';
import moment from 'moment';

const siteRoot = window.app.config.siteRoot;
const slug = window.wiki.config.slug;

class MainPanel extends Component {
  onMenuClick = () => {
    this.props.onMenuClick();
  }

  render() {
    return (
      <div className="main-panel o-hidden">
        <div className="main-panel-top panel-top">
          <span className="sf2-icon-menu side-nav-toggle hidden-md-up d-md-none" title="Side Nav Menu" onClick={this.onMenuClick}></span>
          <div className="common-toolbar">
            <Search />
            <Account />
          </div>
        </div>
        <div className="cur-view-main">
          <div className="cur-view-path">
            <div className="path-containter">
              <a href={siteRoot + 'wikis/'} className="normal">Wikis</a>
              <span className="path-split">/</span>
              <a href={siteRoot + 'wikis/' + slug} className="normal">{slug}</a>
              <span className="path-split">/</span>
              <span>{this.props.fileName}</span>
            </div>
          </div>
          <div className="cur-view-main-con">
            <MarkdownViewer
              markdownContent={this.props.content}
              onLinkClick={this.props.onLinkClick}
            />
            <p id="wiki-page-last-modified">Last modified by {this.props.latestContributor}, <span>{this.props.lastModified}</span></p>
          </div>
        </div>
    </div>
    )
  }
}

export default MainPanel;
