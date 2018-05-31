import React, { Component } from 'react';


class SideNav extends Component {
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

  render(){
    let sideClass = "side-nav side-tabnav col-md-3"
    if (this.state.closeSideBar) {
      sideClass += ' '
    }
    return (
      <div id="side-nav" className={sideClass}>
        <a href="#" title="Close" aria-label="Close" onClick={this.closeSide} className="sf2-icon-x1 sf-popover-close op-icon d-md-none js-close-side-nav fright"></a>
        <h3 className="hd">Files</h3>
        <ul className="side-tabnav-tabs">
          <li className="tab"><a className="ellipsis" title="My Libraries"><span className="sf2-icon-user" aria-hidden="true"></span>My Libraries</a></li>
          <li className="tab"><a className="ellipsis" title="Shared with me"><span className="sf2-icon-share" aria-hidden="true"></span>Shared with me</a></li>
          <li className="tab"><a className="ellipsis" title="Shared with all"><span className="sf2-icon-organization" aria-hidden="true"></span>Shared with all</a></li>
          <li className="tab" id="group-nav">
            <a className="ellipsis" title="Shared with groups" onClick={this.grpsExtend}><span className={`toggle-icon fright ${this.state.groupsExtended ?'icon-caret-down':'icon-caret-left'}`} aria-hidden="true"></span><span className="sf2-icon-group" aria-hidden="true"></span>Shared with groups</a>
            <ul className={`grp-list ${this.state.groupsExtended ? '' : 'hide'}`}>
              <li>
                <a><span className="sharp" aria-hidden="true">#</span>All Groups</a>
              </li>
            </ul>
          </li>
        </ul>

        <div className="hd w100 ovhd">
          <h3 className="fleft">Tools</h3>
        </div>
        <ul className="side-tabnav-tabs">
          <li className="tab"><a><span className="sf2-icon-star" aria-hidden="true"></span>Favorites</a></li>
          <li className="tab"><a className="ellipsis" title="Linked Devices"><span className="sf2-icon-monitor" aria-hidden="true"></span>Linked Devices</a></li>
          <li className="tab" id="share-admin-nav">
            <a href="#" className="ellipsis" title="Share Admin" onClick={this.shExtend}><span className={`toggle-icon fright ${this.state.sharedExtended ? 'icon-caret-down':'icon-caret-left'}`} aria-hidden="true"></span><span aria-hidden="true" className="sf2-icon-wrench"></span>Share Admin</a>
            <ul className={`${this.state.sharedExtended ? '':'hide'}`}>
              <li>
                <a><span aria-hidden="true" className="sharp">#</span>Libraries</a>
              </li>
              <li>
                <a><span aria-hidden="true" className="sharp">#</span>Folders</a>
              </li>
              <li>
                <a><span aria-hidden="true" className="sharp">#</span>Links</a>
              </li>
            </ul>
          </li>
        </ul>
      </div>
      );
    }
  }

export default SideNav;
