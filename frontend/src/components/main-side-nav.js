import React from 'react';
import PropTypes from 'prop-types';
import { Link } from '@reach/router';
import Group from '../models/group';
import { gettext, siteRoot, enableWiki, canAddRepo, canGenerateShareLink, canGenerateUploadLink } from '../utils/constants';
import { seafileAPI } from '../utils/seafile-api';
import { Badge } from 'reactstrap';

import { canViewOrg } from '../utils/constants';

const propTypes = {
  currentTab: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  tabItemClick: PropTypes.func.isRequired,
  draftCounts: PropTypes.number,
};

class MainSideNav extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      groupsExtended: false,
      sharedExtended: false,
      closeSideBar:false,
      groupItems: [],
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
      let groupList = res.data.map(item => {
        let group = new Group(item);
        return group;
      });

      this.groupsHeight = (groupList.length + 1) * _this.listHeight;
      _this.setState({
        groupItems: groupList
      });
    });
  }

  tabItemClick = (param, id) => {
    this.props.tabItemClick(param, id);
  }

  getActiveClass = (tab) => {
    return this.props.currentTab === tab ? 'active' : '';
  }

  renderSharedGroups() {
    let style = {height: 0};
    if (this.state.groupsExtended) {
      style = {height: this.groupsHeight};
    }
    return (
      <ul className={`nav sub-nav nav-pills flex-column grp-list ${this.state.groupsExtended ? 'side-panel-slide' : 'side-panel-slide-up'}`} style={style}>
        <li className="nav-item"> 
          <Link to={siteRoot + 'groups/'}  className={`nav-link ellipsis ${this.getActiveClass('groups')}`} onClick={() => this.tabItemClick('groups')}>
            <span className="sharp" aria-hidden="true">#</span>
            <span className="nav-text">{gettext('All Groups')}</span>
          </Link>
        </li>
        {this.state.groupItems.map(item => {
          return (
            <li key={item.id} className="nav-item"> 
              <Link to={siteRoot + 'group/' + item.id + '/'} className={`nav-link ellipsis ${this.getActiveClass(item.name)}`} onClick={() => this.tabItemClick(item.name, item.id)}>
                <span className="sharp" aria-hidden="true">#</span>
                <span className="nav-text">{item.name}</span>
              </Link>
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

    let linksNavItem = null;
    if (canGenerateShareLink) {
      linksNavItem = (
        <li className="nav-item">
          <Link to={siteRoot + 'share-admin-share-links/'} className={`nav-link ellipsis ${this.getActiveClass('share-admin-share-links')}`} title={gettext('Links')} onClick={() => this.tabItemClick('share-admin-share-links')}>
            <span aria-hidden="true" className="sharp">#</span>
            <span className="nav-text">{gettext('Links')}</span>
          </Link>
        </li>
      );
    } else if (canGenerateUploadLink) {
      linksNavItem = (
        <li className="nav-item">
          <Link to={siteRoot + 'share-admin-upload-links/'} className={`nav-link ellipsis ${this.getActiveClass('share-admin-upload-links')}`} title={gettext('Links')} onClick={() => this.tabItemClick('share-admin-upload-links')}>
            <span aria-hidden="true" className="sharp">#</span>
            <span className="nav-text">{gettext('Links')}</span>
          </Link>
        </li>
      );
    }
    return (
      <ul className={`nav sub-nav nav-pills flex-column ${this.state.sharedExtended ? 'side-panel-slide' : 'side-panel-slide-up'}`} style={style} >
        {canAddRepo && (
          <li className="nav-item">
            <Link to={siteRoot + 'share-admin-libs/'} className={`nav-link ellipsis ${this.getActiveClass('share-admin-libs')}`} title={gettext('Libraries')} onClick={() => this.tabItemClick('share-admin-libs')}>
              <span aria-hidden="true" className="sharp">#</span>
              <span className="nav-text">{gettext('Libraries')}</span>
            </Link>
          </li>
        )}
        <li className="nav-item">
          <Link to={siteRoot + 'share-admin-folders/'} className={`nav-link ellipsis ${this.getActiveClass('share-admin-folders')}`} title={gettext('Folders')} onClick={() => this.tabItemClick('share-admin-folders')}>
            <span aria-hidden="true" className="sharp">#</span>
            <span className="nav-text">{gettext('Folders')}</span>
          </Link>
        </li>
        {linksNavItem}
      </ul>
    );
  }

  render() {
    return (
      <div className="side-nav">
        <div className="side-nav-con">
          <h3 className="sf-heading">{gettext('Files')}</h3>
          <ul className="nav nav-pills flex-column nav-container">
            {canAddRepo && (
              <li className="nav-item">
                <Link to={ siteRoot + 'my-libs/' } className={`nav-link ellipsis ${this.getActiveClass('my-libs') || this.getActiveClass('deleted') }`} title={gettext('My Libraries')} onClick={() => this.tabItemClick('my-libs')}>
                  <span className="sf2-icon-user" aria-hidden="true"></span>
                  <span className="nav-text">{gettext('My Libraries')}</span>
                </Link>
              </li>
            )}
            <li className="nav-item">
              <Link to={siteRoot + 'shared-libs/'} className={`nav-link ellipsis ${this.getActiveClass('shared-libs')}`} title={gettext('Shared with me')} onClick={() => this.tabItemClick('shared-libs')}>
                <span className="sf2-icon-share" aria-hidden="true"></span>
                <span className="nav-text">{gettext('Shared with me')}</span>
              </Link>
            </li>
            { canViewOrg &&
              <li className="nav-item" onClick={() => this.tabItemClick('org')}>
                <Link to={ siteRoot + 'org/' } className={`nav-link ellipsis ${this.getActiveClass('org')}`} title={gettext('Shared with all')}>
                  <span className="sf2-icon-organization" aria-hidden="true"></span>
                  <span className="nav-text">{gettext('Shared with all')}</span>
                </Link>
              </li>
            }
            <li className="nav-item flex-column" id="group-nav">
              <a className="nav-link ellipsis" title={gettext('Shared with groups')} onClick={this.grpsExtend}>
                <span className={`toggle-icon float-right fas ${this.state.groupsExtended ?'fa-caret-down':'fa-caret-left'}`} aria-hidden="true"></span>
                <span className="sf2-icon-group" aria-hidden="true"></span>
                <span className="nav-text">{gettext('Shared with groups')}</span>
              </a>
              {this.renderSharedGroups()}
            </li>
          </ul>

          <h3 className="sf-heading">{gettext('Tools')}</h3>
          <ul className="nav nav-pills flex-column nav-container">
            <li className="nav-item">
              <Link className={`nav-link ellipsis ${this.getActiveClass('starred')}`} to={siteRoot + 'starred/'} title={gettext('Favorites')} onClick={() => this.tabItemClick('starred')}>
                <span className="sf2-icon-star" aria-hidden="true"></span>
                <span className="nav-text">{gettext('Favorites')}</span>
              </Link>
            </li>
            <li className="nav-item">
              <Link className={`nav-link ellipsis ${this.getActiveClass('dashboard')}`} to={siteRoot + 'dashboard/'} title={gettext('Activities')} onClick={() => this.tabItemClick('dashboard')}>
                <span className="sf2-icon-clock" aria-hidden="true"></span>
                <span className="nav-text">{gettext('Activities')}</span>
              </Link>
            </li>
            {enableWiki &&
              <li className="nav-item">
                <Link className={`nav-link ellipsis ${this.getActiveClass('wikis')}`} to={siteRoot + 'wikis/'} title={gettext('Wikis')} onClick={() => this.tabItemClick('wikis')}>
                  <span className="sf2-icon-wiki-view" aria-hidden="true"></span>
                  <span className="nav-text">{gettext('Wikis')}</span>
                </Link>
              </li>
            }
            <li className="nav-item" onClick={() => this.tabItemClick('drafts')}>
              <Link className={`nav-link ellipsis ${this.getActiveClass('drafts') || this.getActiveClass('reviews')}`} to={siteRoot + 'drafts/'} title={gettext('Drafts')}>
                <span className="sf2-icon-edit" aria-hidden="true"></span>
                <span className="draft-info nav-text">
                  {gettext('Drafts')}  
                  {this.props.draftCounts === 0 ? '' : <Badge color="info" pill>{this.props.draftCounts}</Badge>}
                </span>
              </Link>
            </li>
            <li className="nav-item">
              <Link className={`nav-link ellipsis ${this.getActiveClass('linked-devices')}`} to={siteRoot + 'linked-devices/'} title={gettext('Linked Devices')} onClick={() => this.tabItemClick('linked-devices')}>
                <span className="sf2-icon-monitor" aria-hidden="true"></span>
                <span className="nav-text">{gettext('Linked Devices')}</span>
              </Link>
            </li>
            <li className="nav-item flex-column" id="share-admin-nav">
              <a className="nav-link ellipsis" title={gettext('Share Admin')} onClick={this.shExtend}>
                <span className={`toggle-icon float-right fas ${this.state.sharedExtended ? 'fa-caret-down':'fa-caret-left'}`} aria-hidden="true"></span>
                <span className="sf2-icon-wrench" aria-hidden="true"></span>
                <span className="nav-text">{gettext('Share Admin')}</span>
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
