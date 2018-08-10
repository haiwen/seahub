import React, { Component } from 'react';
import TreeView from './tree-view/tree-view';
import { siteRoot, logoPath, mediaUrl, siteTitle, logoWidth, logoHeight } from './constance';

class SidePanel extends Component {
  closeSide = () => {
    this.props.onCloseSide();
  }

  onFileClick = (e, node) => {
    this.props.onFileClick(e, node)
  }

  render() {
    return (
      <div className={`wiki-side-panel ${this.props.closeSideBar ? "": "left-zero"}`}>
        <div className="side-panel-top panel-top">
          <a href={siteRoot} id="logo">
            <img src={mediaUrl + logoPath} title={siteTitle} alt="logo" width={logoWidth} height={logoHeight} />
          </a>
          <a title="Close" aria-label="Close" onClick={this.closeSide} className="sf2-icon-x1 sf-popover-close side-panel-close op-icon d-md-none "></a>
        </div>
        <div id="side-nav" className="wiki-side-nav" role="navigation">
          <h3 className="wiki-pages-heading">Pages</h3>
          <div className="wiki-pages-container">
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
