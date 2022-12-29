import React from 'react';
import PropTypes from 'prop-types';
import { Link } from '@gatsbyjs/reach-router';
import { Badge } from 'reactstrap';
import { gettext, siteRoot, canPublishRepo, canAddRepo, canGenerateShareLink, canGenerateUploadLink, canInvitePeople, dtableWebServer, enableOCM, enableOCMViaWebdav } from '../utils/constants';
import { seafileAPI } from '../utils/seafile-api';
import { Utils } from '../utils/utils';
import toaster from './toast';
import Group from '../models/group';

import { canViewOrg, isDocs, isPro, customNavItems } from '../utils/constants';

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
        groupItems: groupList.sort((a, b) => {
          return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1;
        })
      });
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  tabItemClick = (e, param, id) => {
    if (window.uploader &&
      window.uploader.isUploadProgressDialogShow &&
      window.uploader.totalProgress !== 100) {
      if (!window.confirm(gettext('A file is being uploaded. Are you sure you want to leave this page?'))) {
        e.preventDefault();
        return false;
      }
      window.uploader.isUploadProgressDialogShow = false;
    }
    this.props.tabItemClick(param, id);
  }

  onDTableClick = () => {
    let url = dtableWebServer;
    window.open(url);
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
          <Link to={siteRoot + 'groups/'}  className={`nav-link ellipsis ${this.getActiveClass('groups')}`} onClick={(e) => this.tabItemClick(e, 'groups')}>
            <span className="sharp" aria-hidden="true">#</span>
            <span className="nav-text">{gettext('All Groups')}</span>
          </Link>
        </li>
        {this.state.groupItems.map(item => {
          return (
            <li key={item.id} className="nav-item">
              <Link to={siteRoot + 'group/' + item.id + '/'} className={`nav-link ellipsis ${this.getActiveClass(item.name)}`} onClick={(e) => this.tabItemClick(e, item.name, item.id)}>
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
          <Link to={siteRoot + 'share-admin-share-links/'} className={`nav-link ellipsis ${this.getActiveClass('share-admin-share-links')}`} title={gettext('Links')} onClick={(e) => this.tabItemClick(e, 'share-admin-share-links')}>
            <span aria-hidden="true" className="sharp">#</span>
            <span className="nav-text">{gettext('Links')}</span>
          </Link>
        </li>
      );
    } else if (canGenerateUploadLink) {
      linksNavItem = (
        <li className="nav-item">
          <Link to={siteRoot + 'share-admin-upload-links/'} className={`nav-link ellipsis ${this.getActiveClass('share-admin-upload-links')}`} title={gettext('Links')} onClick={(e) => this.tabItemClick(e, 'share-admin-upload-links')}>
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
            <Link to={siteRoot + 'share-admin-libs/'} className={`nav-link ellipsis ${this.getActiveClass('share-admin-libs')}`} title={gettext('Libraries')} onClick={(e) => this.tabItemClick(e, 'share-admin-libs')}>
              <span aria-hidden="true" className="sharp">#</span>
              <span className="nav-text">{gettext('Libraries')}</span>
            </Link>
          </li>
        )}
        <li className="nav-item">
          <Link to={siteRoot + 'share-admin-folders/'} className={`nav-link ellipsis ${this.getActiveClass('share-admin-folders')}`} title={gettext('Folders')} onClick={(e) => this.tabItemClick(e, 'share-admin-folders')}>
            <span aria-hidden="true" className="sharp">#</span>
            <span className="nav-text">{gettext('Folders')}</span>
          </Link>
        </li>
        {linksNavItem}
      </ul>
    );
  }

  renderCustomNavItems() {
    return (
      customNavItems.map((item, idx) => {
        return (
          <li key={idx} className="nav-item">
            <a href={item.link} className="nav-link ellipsis" title={item.desc}>
              <span className={item.icon} aria-hidden="true"></span>
              <span className="nav-text">{item.desc}</span>
            </a>
          </li>
        );
      })
    );
  }

  render() {
    let showActivity = isDocs || isPro;
    return (
      <div className="side-nav">
        <div className="side-nav-con">
          <h3 className="sf-heading">{gettext('Files')}</h3>
          <ul className="nav nav-pills flex-column nav-container">
            {canAddRepo && (
              <li className="nav-item">
                <Link to={ siteRoot + 'my-libs/' } className={`nav-link ellipsis ${this.getActiveClass('my-libs') || this.getActiveClass('deleted') }`} title={gettext('My Libraries')} onClick={(e) => this.tabItemClick(e, 'my-libs')}>
                  <span className="sf2-icon-user" aria-hidden="true"></span>
                  <span className="nav-text">{gettext('My Libraries')}</span>
                </Link>
              </li>
            )}
            <li className="nav-item">
              <Link to={siteRoot + 'shared-libs/'} className={`nav-link ellipsis ${this.getActiveClass('shared-libs')}`} title={gettext('Shared with me')} onClick={(e) => this.tabItemClick(e, 'shared-libs')}>
                <span className="sf2-icon-share" aria-hidden="true"></span>
                <span className="nav-text">{gettext('Shared with me')}</span>
              </Link>
            </li>
            { canViewOrg &&
              <li className="nav-item" onClick={(e) => this.tabItemClick(e, 'org')}>
                <Link to={ siteRoot + 'org/' } className={`nav-link ellipsis ${this.getActiveClass('org')}`} title={gettext('Shared with all')}>
                  <span className="sf2-icon-organization" aria-hidden="true"></span>
                  <span className="nav-text">{gettext('Shared with all')}</span>
                </Link>
              </li>
            }
            <li className="nav-item flex-column" id="group-nav">
              <a className="nav-link ellipsis" title={gettext('Shared with groups')} onClick={this.grpsExtend}>
                <span className="sf2-icon-group" aria-hidden="true"></span>
                <span className="nav-text">{gettext('Shared with groups')}</span>
                <span className={`toggle-icon fas ${this.state.groupsExtended ?'fa-caret-down':'fa-caret-left'}`} aria-hidden="true"></span>
              </a>
              {this.renderSharedGroups()}
            </li>
            {enableOCM &&
              <li className="nav-item">
                <Link to={siteRoot + 'shared-with-ocm/'} className={`nav-link ellipsis ${this.getActiveClass('shared-with-ocm')}`} title={gettext('Shared from other servers')} onClick={(e) => this.tabItemClick(e, 'shared-with-ocm')}>
                  <span className="sf3-font-share-from-other-servers sf3-font" aria-hidden="true"></span>
                  <span className="nav-text">{gettext('Shared from other servers')}</span>
                </Link>
              </li>
            }
            {enableOCMViaWebdav &&
              <li className="nav-item">
                <Link to={siteRoot + 'ocm-via-webdav/'} className={`nav-link ellipsis ${this.getActiveClass('ocm-via-webdav')}`} title={gettext('Shared from other servers')} onClick={(e) => this.tabItemClick(e, 'ocm-via-webdav')}>
                  <span className="sf3-font-share-from-other-servers sf3-font" aria-hidden="true"></span>
                  <span className="nav-text">{gettext('Shared from other servers')}</span>
                </Link>
              </li>
            }
          </ul>


          <h3 className="sf-heading">{gettext('Tools')}</h3>
          <ul className="nav nav-pills flex-column nav-container">
            <li className="nav-item">
              <Link className={`nav-link ellipsis ${this.getActiveClass('starred')}`} to={siteRoot + 'starred/'} title={gettext('Favorites')} onClick={(e) => this.tabItemClick(e, 'starred')}>
                <span className="sf2-icon-star" aria-hidden="true"></span>
                <span className="nav-text">{gettext('Favorites')}</span>
              </Link>
            </li>
            {showActivity &&
              <li className="nav-item">
                <Link className={`nav-link ellipsis ${this.getActiveClass('dashboard')}`} to={siteRoot + 'dashboard/'} title={gettext('Activities')} onClick={(e) => this.tabItemClick(e, 'dashboard')}>
                  <span className="sf2-icon-clock" aria-hidden="true"></span>
                  <span className="nav-text">{gettext('Activities')}</span>
                </Link>
              </li>
            }
            {canPublishRepo &&
              <li className="nav-item">
                <Link className={`nav-link ellipsis ${this.getActiveClass('published')}`} to={siteRoot + 'published/'} title={gettext('Published Libraries')} onClick={(e) => this.tabItemClick(e, 'published')}>
                  <span className="sf2-icon-wiki-view" aria-hidden="true"></span>
                  <span className="nav-text">{gettext('Published Libraries')}</span>
                </Link>
              </li>
            }
            {isDocs &&
              <li className="nav-item" onClick={(e) => this.tabItemClick(e, 'drafts')}>
                <Link className={`nav-link ellipsis ${this.getActiveClass('drafts')}`} to={siteRoot + 'drafts/'} title={gettext('Drafts')}>
                  <span className="sf2-icon-edit" aria-hidden="true"></span>
                  <span className="nav-text">{gettext('Drafts')}</span>
                  {this.props.draftCounts > 0 && <span id="draft-num">{this.props.draftCounts}</span>}
                </Link>
              </li>
            }
            <li className="nav-item">
              <Link className={`nav-link ellipsis ${this.getActiveClass('linked-devices')}`} to={siteRoot + 'linked-devices/'} title={gettext('Linked Devices')} onClick={(e) => this.tabItemClick(e, 'linked-devices')}>
                <span className="sf2-icon-monitor" aria-hidden="true"></span>
                <span className="nav-text">{gettext('Linked Devices')}</span>
              </Link>
            </li>
            {canInvitePeople &&
              <li className="nav-item">
                <Link className={`nav-link ellipsis ${this.getActiveClass('invitations')}`} to={siteRoot + 'invitations/'} title={gettext('Invite Guest')} onClick={(e) => this.tabItemClick(e, 'invitations')}>
                  <span className="sf2-icon-invite" aria-hidden="true"></span>
                  <span className="nav-text">{gettext('Invite Guest')}</span>
                </Link>
              </li>
            }
            <li className="nav-item flex-column" id="share-admin-nav">
              <a className="nav-link ellipsis" title={gettext('Share Admin')} onClick={this.shExtend}>
                <span className="sf2-icon-wrench" aria-hidden="true"></span>
                <span className="nav-text">{gettext('Share Admin')}</span>
                <span className={`toggle-icon fas ${this.state.sharedExtended ? 'fa-caret-down':'fa-caret-left'}`} aria-hidden="true"></span>
              </a>
              {this.renderSharedAdmin()}
            </li>
            {customNavItems && this.renderCustomNavItems()}
          </ul>
        </div>

        {dtableWebServer &&
          <div className="side-nav-link" onClick={this.onDTableClick}>
            <span className="link-icon icon-left sf3-font sf3-font-dtable-logo" aria-hidden="true"></span>
            <span className="link-text">SeaTable</span>
            <span className="link-icon icon-right sf3-font sf3-font-arrow"></span>
          </div>
        }
      </div>
    );
  }
}

MainSideNav.propTypes = propTypes;

export default MainSideNav;
