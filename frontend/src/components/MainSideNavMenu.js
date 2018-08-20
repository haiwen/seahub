import React from 'react';
const siteRoot = window.app.config.siteRoot;
const serverRoot = window.app.config.serverRoot;
const logoPath =  window.app.config.logoPath;
const mediaUrl = window.app.config.mediaUrl;
const siteTitle = window.app.config.siteTitle;
const logoWidth = window.app.config.logoWidth;
const logoHeight = window.app.config.logoHeight;

class  MainSideNavMenu extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      groupsExtended: false,
      sharedExtended: false,
      closeSideBar:false,
      groupItems: []
    };

    this.loadGroups = this.loadGroups.bind(this);
  }

  grpsExtend = () => {
    this.setState({
      groupsExtended: !this.state.groupsExtended,
    })
    this.loadGroups();
  }

  shExtend = () => {
    this.setState({
      sharedExtended: !this.state.sharedExtended,
    })
  }

  loadGroups() {
    this.props.seafileAPI.getGroups().then(res =>{
      this.setState({
        groupItems: res.data.groups
      })
    })
  }

  render() {
    return (
      <div id="side-nav" className="home-side-nav">
        <div className="side-nav-con">
          <h3 className="hd">Files</h3>
          <ul className="side-tabnav-tabs">
            <li className="tab"><a href={siteRoot + '#my-libs'} className="ellipsis" title="My Libraries"><span className="sf2-icon-user" aria-hidden="true"></span>My Libraries</a></li>
            <li className="tab"><a href={serverRoot + siteRoot + '#shared-libs/'} className="ellipsis" title="Shared with me"><span className="sf2-icon-share" aria-hidden="true"></span>Shared with me</a></li>
            <li className="tab"><a href={serverRoot + siteRoot + '#org/'} className="ellipsis" title="Shared with all"><span className="sf2-icon-organization" aria-hidden="true"></span>Shared with all</a></li>
            <li className="tab" id="group-nav">
              <a className="ellipsis" title="Shared with groups" onClick={this.grpsExtend}><span className={`toggle-icon float-right ${this.state.groupsExtended ?'icon-caret-down':'icon-caret-left'}`} aria-hidden="true"></span><span className="sf2-icon-group" aria-hidden="true"></span>Shared with groups</a>
              <ul className={`grp-list ${this.state.groupsExtended ? '' : 'hide'}`}>
                <li>
                  <a href={siteRoot + '#groups/'}><span className="sharp" aria-hidden="true">#</span>All Groups</a>
                </li>
                {this.state.groupItems.map(item => (
                      <li key={item.id}> 
                        <a href={siteRoot + '#group/' + item.id + '/'}>
                        <span className="sharp" aria-hidden="true">#</span>{item.name}</a>
                      </li>
                      ))}
              </ul>
            </li>
          </ul>

          <div className="hd w-100 o-hidden">
            <h3 className="float-left">Tools</h3>
          </div>
          <ul className="side-tabnav-tabs">
            <li className="tab"><a href={siteRoot + '#starred/'}><span className="sf2-icon-star" aria-hidden="true"></span>Favorites</a></li>
            <li className="tab"><a href={siteRoot + 'dashboard'}><span className="sf2-icon-clock" aria-hidden="true"></span>Acitivities</a></li>
            <li className="tab"><a href={siteRoot + '#devices/'} className="ellipsis" title="Linked Devices"><span className="sf2-icon-monitor" aria-hidden="true"></span>Linked Devices</a></li>
            <li className="tab" id="share-admin-nav">
              <a className="ellipsis" title="Share Admin" onClick={this.shExtend}><span className={`toggle-icon float-right ${this.state.sharedExtended ? 'icon-caret-down':'icon-caret-left'}`} aria-hidden="true"></span><span aria-hidden="true" className="sf2-icon-wrench"></span>Share Admin</a>
              <ul className={`${this.state.sharedExtended ? '':'hide'}`}>
                <li>
                  <a href={siteRoot + '#share-admin-libs/'}><span aria-hidden="true" className="sharp">#</span>Libraries</a>
                </li>
                <li>
                  <a href={siteRoot + '#share-admin-folders/'}><span aria-hidden="true" className="sharp">#</span>Folders</a>
                </li>
                <li>
                  <a href={siteRoot + '#share-admin-share-links/'}><span aria-hidden="true" className="sharp">#</span>Links</a>
                </li>
              </ul>
            </li>
          </ul>
        </div>
      </div>
    )
  }
}

export default MainSideNavMenu;
