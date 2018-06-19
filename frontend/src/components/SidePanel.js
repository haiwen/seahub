import React, { Component } from 'react';

const siteRoot = window.app.config.siteRoot;
const serverRoot = window.app.config.serverRoot;
const logoPath =  window.app.config.logoPath;
const mediaUrl = window.app.config.mediaUrl;
const siteTitle = window.app.config.siteTitle;
const logoWidth = window.app.config.logoWidth;
const logoHeight = window.app.config.logoHeight;

class SidePanel extends Component { 
  constructor(props) {
    super(props);
    this.state = {
      groupsExtended: false,
      sharedExtended: false,
      closeSideBar:false,
    }; 
  }

  grpsExtend = () => {
    this.setState({
      groupsExtended: !this.state.groupsExtended,
    })
  }

  shExtend = () => {
    this.setState({
      sharedExtended: !this.state.sharedExtended,
    })
  }

  closeSide = () => {
    this.setState({
      closeSideBar: !this.state.closeSideBar, 
    })
  }

  render() {
    return (  
      <div className={`side-panel col-md-3 ${this.state.closeSideBar ? "": "left-zero"}`}>
          <div className="side-panel-top panel-top">
            <a href={`${siteRoot}`} id="logo">
              <img src={`${mediaUrl}${logoPath}`} title={`${siteTitle}`} alt="logo" width={`${logoWidth}`} height={`${logoHeight}`} />
            </a>
            <a href="#" title="Close" aria-label="Close" onClick={this.closeSide} className="sf2-icon-x1 sf-popover-close side-panel-close op-icon d-md-none "></a>
          </div>
          <div id="side-nav" className="home-side-nav" role="navigation">
            <div className="side-nav-con">
              <h3 className="hd">DashBoard</h3>
                <ul className="side-tabnav-tabs">
                  <li className="tab"><a href={`${siteRoot}dashboard/`}><span className="sf2-icon-clock" aria-hidden="true"></span>DashBoard</a></li>
                </ul>
              <h3 className="hd">Files</h3>
              <ul className="side-tabnav-tabs">
                <li className="tab"><a href={`${siteRoot}#my-libs/`} className="ellipsis" title="My Libraries"><span className="sf2-icon-user" aria-hidden="true"></span>My Libraries</a></li>
                <li className="tab"><a href={`${serverRoot}${siteRoot}#shared-libs/`} className="ellipsis" title="Shared with me"><span className="sf2-icon-share" aria-hidden="true"></span>Shared with me</a></li>
                <li className="tab"><a href={`${serverRoot}${siteRoot}#org/`} className="ellipsis" title="Shared with all"><span className="sf2-icon-organization" aria-hidden="true"></span>Shared with all</a></li>
                <li className="tab" id="group-nav">
                  <a className="ellipsis" title="Shared with groups" onClick={this.grpsExtend}><span className={`toggle-icon float-right ${this.state.groupsExtended ?'icon-caret-down':'icon-caret-left'}`} aria-hidden="true"></span><span className="sf2-icon-group" aria-hidden="true"></span>Shared with groups</a>
                  <ul className={`grp-list ${this.state.groupsExtended ? '' : 'hide'}`}>
                    <li>
                      <a href={`${serverRoot}${siteRoot}#groups/`}><span className="sharp" aria-hidden="true">#</span>All Groups</a>
                    </li>
                  </ul>
                </li>
              </ul>

              <div className="hd w-100 o-hidden">
                <h3 className="float-left">Tools</h3>
              </div>
              <ul className="side-tabnav-tabs">
                <li className="tab"><a href={`${serverRoot}${siteRoot}#starred/`}><span className="sf2-icon-star" aria-hidden="true"></span>Favorites</a></li>
                <li className="tab"><a href={`${serverRoot}${siteRoot}#devices/`} className="ellipsis" title="Linked Devices"><span className="sf2-icon-monitor" aria-hidden="true"></span>Linked Devices</a></li>
                <li className="tab" id="share-admin-nav">
                  <a className="ellipsis" title="Share Admin" onClick={this.shExtend}><span className={`toggle-icon float-right ${this.state.sharedExtended ? 'icon-caret-down':'icon-caret-left'}`} aria-hidden="true"></span><span aria-hidden="true" className="sf2-icon-wrench"></span>Share Admin</a>
                  <ul className={`${this.state.sharedExtended ? '':'hide'}`}>
                    <li>
                      <a href={`${serverRoot}${siteRoot}#share-admin-libs/`}><span aria-hidden="true" className="sharp">#</span>Libraries</a>
                    </li>
                    <li>
                      <a href={`${serverRoot}${siteRoot}#share-admin-folders/`}><span aria-hidden="true" className="sharp">#</span>Folders</a>
                    </li>
                    <li>
                      <a href=""><span aria-hidden="true" className="sharp">#</span>Links</a>
                    </li>
                  </ul>
                </li>
              </ul>
            </div>
            <div className="side-nav-footer" role="contentinfo">
              <a href="/help/" target="_blank" className="item">Help</a>
              <a href="#" className="js-about item">About</a>
              <a href="/download_client_program/" className="item last-item"><span aria-hidden="true" className="sf2-icon-monitor vam"></span> <span className="vam">Clients</span></a>
              <div className="about-content hide">
                <p><img src="/media/img/seafile-logo.png" title="Private Seafile" alt="logo" width="128" height="32" /></p>
                <p>Server Version: 6.2.0<br /> © 2018 Seafile</p>
                <p><a href="http://seafile.com/about/" target="_blank">About Us</a></p>
              </div>
            </div>
          </div>
        </div>
      )
  }
}
export default SidePanel;
