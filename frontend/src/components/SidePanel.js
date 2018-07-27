import React, { Component } from 'react';
import 'whatwg-fetch';
import TreeView from './tree-view/tree-view';

const siteRoot = window.app.config.siteRoot;
const logoPath =  window.app.config.logoPath;
const mediaUrl = window.app.config.mediaUrl;
const siteTitle = window.app.config.siteTitle;
const logoWidth = window.app.config.logoWidth;
const logoHeight = window.app.config.logoHeight;
const slug = window.wiki.config.slug;

class SidePanel extends Component {
  closeSide = () => {
    this.props.onCloseSide();
  }

  onFileClick = (e, node) => {
    this.props.onFileClick(e, node)
  }

  render() {
    return (
      <div className={`side-panel col-md-3 ${this.props.closeSideBar ? "": "left-zero"}`}>
        <div className="side-panel-top panel-top">
          <a href={siteRoot} id="logo">
            <img src={mediaUrl + logoPath} title={siteTitle} alt="logo" width={logoWidth} height={logoHeight} />
          </a>
          <a title="Close" aria-label="Close" onClick={this.closeSide} className="sf2-icon-x1 sf-popover-close side-panel-close op-icon d-md-none "></a>
        </div>
        <div id="side-nav" className="wiki-side-nav" role="navigation">
          <h3 className="wiki-pages-heading">Pages</h3>
          <div id="wiki-pages-container">
            <TreeView
              editorUtilities={this.props.editorUtilities}
              onClick={this.onFileClick}
            />
          </div>
        </div>
      </div>
    )
  }
}
export default SidePanel;
