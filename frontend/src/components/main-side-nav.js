import React from 'react';
import PropTypes from 'prop-types';
import { Link } from '@reach/router';
import { gettext, siteRoot } from '../utils/constants';
import { seafileAPI } from '../utils/seafile-api';
import { Badge } from 'reactstrap';

import { canViewOrg } from '../utils/constants';

const propTypes = {
  currentTab: PropTypes.string.isRequired,
};

class MainSideNav extends React.Component {
  constructor(props) {
    super(props);
    let currentTab = this.props.currentTab || '';
    this.state = {
      groupsExtended: false,
      sharedExtended: false,
      closeSideBar:false,
      groupItems: [],
      currentTab: currentTab,
    };

    this.listHeight = 24; //for caculate tabheight
    this.groupsHeight = 0;
    this.adminHeight = 0;
  }

  grpsExtend = () => {
    this.setState({
      groupsExtended: !this.state.groupsExtended,
    });
    this.loadGroups();
  }

  shExtend = () => {
    this.setState({
      sharedExtended: !this.state.sharedExtended,
    });
  }

  loadGroups = () => {
    let _this = this;
    seafileAPI.listGroups().then(res =>{
      let data   = res.data.groups;
      this.groupsHeight = (data.length + 1) * _this.listHeight;
      _this.setState({
        groupItems: data
      });
    });
  }

  tabItemClick = (param) => {
    this.setState({
      currentTab: param
    });
  }

  renderSharedGroups() {
    let style = {height: 0};
    if (this.state.groupsExtended) {
      style = {height: this.groupsHeight};
    }
    return (
      <ul className={`grp-list ${this.state.groupsExtended ? 'side-panel-slide' : 'side-panel-slide-up'}`} style={style}>
        <li className={this.state.currentTab === 'groups' ? 'tab-cur' : ''}> 
          <a href={siteRoot + '#groups/'} onClick={() => this.tabItemClick('groups')}>
            <span className="sharp" aria-hidden="true">#</span>
            {gettext('All Groups')}
          </a>
        </li>
        {this.state.groupItems.map(item => {
          return (
            <li key={item.id} className={this.state.currentTab === item.id ? 'tab-cur' : ''}> 
              <a href={siteRoot + '#group/' + item.id + '/'} className="ellipsis" onClick={() => this.tabItemClick(item.id)}>
                <span className="sharp" aria-hidden="true">#</span>
                {item.name}
              </a>
            </li>
          );
        })}
      </ul>
    );
  }

  renderSharedAdmin() {
    let height = 0;
    if (this.state.sharedExtended) {
      if (!this.adminHeight) {
        this.adminHeight = 3 * this.listHeight;
      }
      height = this.adminHeight;
    }
    let style = {height: height};
    return (
      <ul className={`${this.state.sharedExtended ? 'side-panel-slide' : 'side-panel-slide-up'}`} style={style} >
        <li className={this.state.currentTab === 'share-admin-libs' ? 'tab-cur' : ''}>
          <Link to={siteRoot + 'share-admin-libs/'} className="ellipsis" title={gettext('Libraries')} onClick={() => this.tabItemClick('share-admin-libs')}>
            <span aria-hidden="true" className="sharp">#</span>
            {gettext('Libraries')}
          </Link>
        </li>
        <li className={this.state.currentTab === 'share-admin-folders' ? 'tab-cur' : ''}>
          <Link to={siteRoot + 'share-admin-folders/'} className="ellipsis" title={gettext('Folders')} onClick={() => this.tabItemClick('share-admin-folders')}>
            <span aria-hidden="true" className="sharp">#</span>
            {gettext('Folders')}
          </Link>
        </li>
        <li className={this.state.currentTab === 'share-admin-share-links' ? 'tab-cur' : ''}>
          <Link to={siteRoot + 'share-admin-share-links/'} className="ellipsis" title={gettext('Links')} onClick={() => this.tabItemClick('share-admin-share-links')}>
            <span aria-hidden="true" className="sharp">#</span>
            {gettext('Links')}
          </Link>
        </li>
      </ul>
    );
  }

  render() {
    return (
      <div id="side-nav" className="home-side-nav">
        <div className="side-nav-con">
          <h3 className="sf-heading">Files</h3>
          <ul className="side-tabnav-tabs">
            <li className={`tab ${this.state.currentTab === 'my-libs' ? 'tab-cur' : ''}`}>
              <a href={ siteRoot + '#my-libs' } className="ellipsis" title={gettext('My Libraries')} onClick={() => this.tabItemClick('my-libs')}>
                <span className="sf2-icon-user" aria-hidden="true"></span>
                {gettext('My Libraries')}
              </a>
            </li>
            <li className={`tab ${this.state.currentTab === 'shared-libs' ? 'tab-cur' : ''}`}>
              <a href={ siteRoot + '#shared-libs/'} className="ellipsis" title={gettext('Shared with me')} onClick={() => this.tabItemClick('shared-libs')}>
                <span className="sf2-icon-share" aria-hidden="true"></span>
                {gettext('Shared with me')}
              </a>
            </li>
            { canViewOrg &&
              <li className={`tab ${this.state.currentTab === 'org' ? 'tab-cur' : ''}`} onClick={() => this.tabItemClick('org')}>
                <a href={ siteRoot + '#org/' } className="ellipsis" title={gettext('Shared with all')}>
                  <span className="sf2-icon-organization" aria-hidden="true"></span>
                  {gettext('Shared with all')}
                </a>
              </li>
            }
            <li className="tab" id="group-nav">
              <a className="ellipsis user-select-no" title={gettext('Shared with groups')} onClick={this.grpsExtend}>
                <span className={`toggle-icon float-right fas ${this.state.groupsExtended ?'fa-caret-down':'fa-caret-left'}`} aria-hidden="true"></span>
                <span className="sf2-icon-group" aria-hidden="true"></span>
                {gettext('Shared with groups')}
              </a>
              {this.renderSharedGroups()}
            </li>
          </ul>

          <h3 className="sf-heading">Tools</h3>
          <ul className="side-tabnav-tabs">
            <li className={`tab ${this.state.currentTab === 'starred' ? 'tab-cur' : ''}`}>
              <Link to={siteRoot + 'starred/'} title={gettext('Favorites')} onClick={() => this.tabItemClick('starred')}>
                <span className="sf2-icon-star" aria-hidden="true"></span>
                {gettext('Favorites')}
              </Link>
            </li>
            <li className={`tab ${this.state.currentTab === 'dashboard' ? 'tab-cur' : ''}`}>
              <Link to={siteRoot + 'dashboard/'} title={gettext('Acitivities')} onClick={() => this.tabItemClick('dashboard')}>
                <span className="sf2-icon-clock" aria-hidden="true"></span>
                {gettext('Acitivities')}
              </Link>
            </li>
            <li className={`tab ${this.state.currentTab === 'linked-devices' ? 'tab-cur' : ''}`}>
              <Link to={siteRoot + 'linked-devices/'} title={gettext('Linked Devices')} onClick={() => this.tabItemClick('linked-devices')}>
                <span className="sf2-icon-monitor" aria-hidden="true"></span>
                {gettext('Linked Devices')}
              </Link>
            </li>
            <li className={`tab ${this.state.currentTab === 'drafts' ? 'tab-cur' : ''}`} onClick={() => this.tabItemClick('drafts')}>
              <Link to={siteRoot + 'drafts/'} title={gettext('Drafts')}>
                <span className="sf2-icon-edit" aria-hidden="true"></span>
                {gettext('Drafts')}  {this.props.draftCounts === 0 ? '' : <Badge color="info" pill>{this.props.draftCounts}</Badge>}
              </Link>
            </li>
            <li className="tab" id="share-admin-nav">
              <a className="ellipsis user-select-no" title={gettext('Share Admin')} onClick={this.shExtend}>
                <span className={`toggle-icon float-right fas ${this.state.sharedExtended ? 'fa-caret-down':'fa-caret-left'}`} aria-hidden="true"></span>
                <span aria-hidden="true" className="sf2-icon-wrench"></span>
                {gettext('Share Admin')}
              </a>
              {this.renderSharedAdmin()}
            </li>
          </ul>
        </div>
      </div>
    );
  }
}

MainSideNav.propTypes = propTypes;

export default MainSideNav;
