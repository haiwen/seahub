import React, { Component } from 'react';
import SideNavFooter from '../../components/SideNavFooter';
import MainSideNav from '../../components/main-side-nav';

const siteRoot = window.app.config.siteRoot;
const serverRoot = window.app.config.serverRoot;
const logoPath =  window.app.config.logoPath;
const mediaUrl = window.app.config.mediaUrl;
const siteTitle = window.app.config.siteTitle;
const logoWidth = window.app.config.logoWidth;
const logoHeight = window.app.config.logoHeight;

class SidePanel extends Component {

  render() {
    return (
      <div className={`side-panel ${this.props.isOpen ? "left-zero": ""}`}>
        <div className="side-panel-top panel-top">
          <a href={siteRoot} id="logo">
            <img src={mediaUrl + logoPath} title={siteTitle} alt="logo" width={logoWidth} height={logoHeight} />
          </a>
          <a href="#" title="Close" aria-label="Close" onClick={this.props.toggleClose} className="sf2-icon-x1 sf-popover-close side-panel-close op-icon d-md-none "></a>
        </div>
        <MainSideNav  seafileAPI={this.props.seafileAPI}/>
        <SideNavFooter />
      </div>
      )
  }
}
export default SidePanel;
