import React, { Component } from 'react';
import FilesActivities from '../../components/FilesActivities';
import Account from '../../components/account';
import Notification from '../../components/Notification';

const siteRoot = window.app.config.siteRoot;
const serverRoot = window.app.config.serverRoot;
const logoPath =  window.app.config.logoPath;
const mediaUrl = window.app.config.mediaUrl;
const siteTitle = window.app.config.siteTitle;
const logoWidth = window.app.config.logoWidth;
const logoHeight = window.app.config.logoHeight;
let userName = window.app.config.userName;
let contactEmail = window.app.config.contactEmail;
let avatarInfo = window.app.config.avatarInfo;


class MainPanel extends Component {
  constructor(props) {
    super(props);
  }

  onMenuClick = () => {
    this.props.isOpen();
  }


  render() {
    const { children } = this.props
    return (
      <div className="main-panel o-hidden">
        <div className="main-panel-top panel-top">
        <span className="sf2-icon-menu side-nav-toggle hidden-md-up d-md-none" title="Side Nav Menu" onClick={this.onMenuClick}></span>
        <div className="common-toolbar">
          {children}
        </div>
      </div>
      <FilesActivities seafileAPI={this.props.seafileAPI} />
    </div>
    )
  }
}

export default MainPanel;
