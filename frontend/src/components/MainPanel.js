import React, { Component } from 'react';
import FilesActivities from './FilesActivities';

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
    this.state = {
      showInfo: false,
      spaceTraffic: ''
    }
  }

  onClickAccount = () => {
    const url = `${serverRoot}${siteRoot}ajax/space_and_traffic/`
    fetch(url, {
      credentials: 'same-origin',
      headers: new Headers({
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
      })
    })
    .then(resp => resp.json())
    .then(res => {
     this.setState({
       showInfo: !this.state.showInfo,
       spaceTraffic: res.html,
     }) 
    })
  }

  render() {
    return (
      <div className="col-md-9 main-panel flex-auto o-hidden">
        <div className="main-panel-top panel-top">
        <span className="sf2-icon-menu side-nav-toggle hidden-md-up d-md-none" title="Side Nav Menu" id="js-toggle-side-nav" aria-label="Side Nav Menu"></span>
        <div className="common-toolbar">
          <div id="notifications">
            <a href="#" className="no-deco" id="notice-icon" title="Notifications" aria-label="Notifications">
              <span className="sf2-icon-bell"></span>
              <span className="num hide">0</span>
            </a>
          </div>
          <div id="account">
            <a id="my-info" onClick={this.onClickAccount} className="account-toggle no-deco d-none d-md-block" aria-label="View profile and more">
             <span dangerouslySetInnerHTML = {{ __html:avatarInfo }}></span> <span className="icon-caret-down vam"></span>
            </a>
            <span className="account-toggle sf2-icon-more mobile-icon d-md-none" aria-label="View profile and more"></span>
            <div id="user-info-popup" className={`account-popup sf-popover ${this.state.showInfo? '':'hide'}`}>
             <div className="outer-caret up-outer-caret"><div className="inner-caret"></div></div>
             <div className="sf-popover-con">
               <div className="item o-hidden">
                 <span dangerouslySetInnerHTML = {{ __html:avatarInfo }}></span>
                 <div className="txt">
                  {userName} <br/>
                  {contactEmail}
                 </div>
               </div>
               <div id="space-traffic" dangerouslySetInnerHTML = {{ __html:this.state.spaceTraffic }}></div>
               <a href={`${serverRoot}${siteRoot}profile/`}className="item">Settings</a>
               <a href={`${serverRoot}${siteRoot}sys/useradmin/`}title="System Admin" className="item">System Admin</a>
               <a href={`${serverRoot}${siteRoot}accounts/logout/`}className="item" id="logout">Log out</a>
             </div>
            </div>
          </div>
        </div>
      </div>
      <div id="right-panel" className="cur-view-main-con">
        <FilesActivities />
      </div>
    </div>
    )
  }
}

export default MainPanel;
