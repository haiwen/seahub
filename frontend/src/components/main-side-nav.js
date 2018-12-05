import React from 'react';
import PropTypes from 'prop-types';
import { Link } from '@reach/router';
import { gettext, siteRoot } from '../utils/constants';
import { seafileAPI } from '../utils/seafile-api';
import { Badge } from 'reactstrap';

import { canViewOrg } from '../utils/constants';

const propTypes = {
  currentTab: PropTypes.string.isRequired,
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
      let data   = res.data.groups;
      this.groupsHeight = (data.length + 1) * _this.listHeight;
      _this.setState({
        groupItems: data
      });
    });
  }

  tabItemClick = (param) => {
    this.props.tabItemClick(param);
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
        <li className="nav-item sf-nav-item"> 
          <Link className={`nav-link sf-nav-link ellipsis ${this.getActiveClass('groups')}`} href={siteRoot + '#groups/'} onClick={() => this.tabItemClick('groups')}>
            <span className="sharp" aria-hidden="true">#</span>
            {gettext('All Groups')}
          </Link>
        </li>
        {this.state.groupItems.map(item => {
          return (
            <li key={item.id} className="nav-item sf-nav-item"> 
              <Link href={siteRoot + '#group/' + item.id + '/'} className={`nav-link sf-nav-link ellipsis ${this.getActiveClass(item.id)}`} onClick={() => this.tabItemClick(item.id)}>
                <span className="sharp" aria-hidden="true">#</span>
                {item.name}
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
    return (
      <ul className={`nav sub-nav nav-pills flex-column ${this.state.sharedExtended ? 'side-panel-slide' : 'side-panel-slide-up'}`} style={style} >
        <li className="nav-item sf-nav-item">
          <Link to={siteRoot + 'share-admin-libs/'} className={`nav-link sf-nav-link ellipsis ${this.getActiveClass('share-admin-libs')}`} title={gettext('Libraries')} onClick={() => this.tabItemClick('share-admin-libs')}>
            <span aria-hidden="true" className="sharp">#</span>
            {gettext('Libraries')}
          </Link>
        </li>
        <li className="nav-item sf-nav-item">
          <Link to={siteRoot + 'share-admin-folders/'} className={`nav-link sf-nav-link ellipsis ${this.getActiveClass('share-admin-folders')}`} title={gettext('Folders')} onClick={() => this.tabItemClick('share-admin-folders')}>
            <span aria-hidden="true" className="sharp">#</span>
            {gettext('Folders')}
          </Link>
        </li>
        <li className="nav-item sf-nav-item">
          <Link to={siteRoot + 'share-admin-share-links/'} className={`nav-link sf-nav-link ellipsis ${this.getActiveClass('share-admin-share-links') || this.getActiveClass('share-admin-upload-links')}`} title={gettext('Links')} onClick={() => this.tabItemClick('share-admin-share-links')}>
            <span aria-hidden="true" className="sharp">#</span>
            {gettext('Links')}
          </Link>
        </li>
      </ul>
    );
  }

  render() {
    return (
      <div className="side-nav">
        <div className="side-nav-con">
          <h3 className="sf-heading">Files</h3>
          <ul className="nav nav-pills flex-column sf-nav">
            <li className="nav-item sf-nav-item">
              <Link to={ siteRoot + 'my-libs/' } className={`nav-link sf-nav-link ellipsis ${this.getActiveClass('my-libs')}`} title={gettext('My Libraries')} onClick={() => this.tabItemClick('my-libs')}>
                <span className="sf2-icon-user" aria-hidden="true"></span>
                {gettext('My Libraries')}
              </Link>
            </li>
            <li className="nav-item sf-nav-item">
              <Link to={siteRoot + 'shared-libs/'} className={`nav-link sf-nav-link ellipsis ${this.getActiveClass('shared-libs')}`} title={gettext('Shared with me')} onClick={() => this.tabItemClick('shared-libs')}>
                <span className="sf2-icon-share" aria-hidden="true"></span>
                {gettext('Shared with me')}
              </Link>
            </li>
            { canViewOrg &&
              <li className="nav-item sf-nav-item" onClick={() => this.tabItemClick('org')}>
                <a href={ siteRoot + '#org/' } className={`nav-link sf-nav-link ellipsis ${this.getActiveClass('org')}`} title={gettext('Shared with all')}>
                  <span className="sf2-icon-organization" aria-hidden="true"></span>
                  {gettext('Shared with all')}
                </a>
              </li>
            }
            <li className="nav-item sf-nav-item flex-column" id="group-nav">
              <a className="nav-link sf-nav-link ellipsis" title={gettext('Shared with groups')} onClick={this.grpsExtend}>
                <span className={`toggle-icon float-right fas ${this.state.groupsExtended ?'fa-caret-down':'fa-caret-left'}`} aria-hidden="true"></span>
                <span className="sf2-icon-group" aria-hidden="true"></span>
                {gettext('Shared with groups')}
              </a>
              {this.renderSharedGroups()}
            </li>
          </ul>

          <h3 className="sf-heading">Tools</h3>
          <ul className="nav nav-pills flex-column sf-nav">
            <li className="nav-item sf-nav-item">
              <Link className={`nav-link sf-nav-link ellipsis ${this.getActiveClass('starred')}`} to={siteRoot + 'starred/'} title={gettext('Favorites')} onClick={() => this.tabItemClick('starred')}>
                <span className="sf2-icon-star" aria-hidden="true"></span>
                {gettext('Favorites')}
              </Link>
            </li>
            <li className="nav-item sf-nav-item">
              <Link className={`nav-link sf-nav-link ellipsis ${this.getActiveClass('dashboard')}`} to={siteRoot + 'dashboard/'} title={gettext('Acitivities')} onClick={() => this.tabItemClick('dashboard')}>
                <span className="sf2-icon-clock" aria-hidden="true"></span>
                {gettext('Acitivities')}
              </Link>
            </li>
            <li className="nav-item sf-nav-item">
              <Link className={`nav-link sf-nav-link ellipsis ${this.getActiveClass('linked-devices')}`} to={siteRoot + 'linked-devices/'} title={gettext('Linked Devices')} onClick={() => this.tabItemClick('linked-devices')}>
                <span className="sf2-icon-monitor" aria-hidden="true"></span>
                {gettext('Linked Devices')}
              </Link>
            </li>
            <li className="nav-item sf-nav-item" onClick={() => this.tabItemClick('drafts')}>
              <Link className={`nav-link sf-nav-link ellipsis ${this.getActiveClass('drafts') || this.getActiveClass('reviews')}`} to={siteRoot + 'drafts/'} title={gettext('Drafts')}>
                <span className="sf2-icon-edit" aria-hidden="true"></span>
                <span className="draft-info">
                  {gettext('Drafts')}  
                  {this.props.draftCounts === 0 ? '' : <Badge color="info" pill>{this.props.draftCounts}</Badge>}
                </span>
              </Link>
            </li>
            <li className="nav-item sf-nav-item flex-column" id="share-admin-nav">
              <a className="nav-link sf-nav-link ellipsis" title={gettext('Share Admin')} onClick={this.shExtend}>
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
