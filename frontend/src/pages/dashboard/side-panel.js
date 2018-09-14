import React, { Component } from 'react';
import SideNavFooter from '../../components/side-nav-footer';
import MainSideNav from '../../components/main-side-nav';

import { siteRoot, logoPath, mediaUrl, siteTitle, logoWidth, logoHeight } from '../../components/constants';

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
        <MainSideNav  />
        <SideNavFooter />
      </div>
      )
  }
}
export default SidePanel;
