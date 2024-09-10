import React from 'react';
import PropTypes from 'prop-types';
import { Link } from '@gatsbyjs/reach-router';
import {
  gettext, siteRoot, canAddGroup, canAddRepo, canShareRepo,
  canGenerateShareLink, canGenerateUploadLink, canInvitePeople,
  enableTC, sideNavFooterCustomHtml, additionalAppBottomLinks,
  canViewOrg, isDocs, isPro, isDBSqlite3, customNavItems, mediaUrl
} from '../utils/constants';
import { seafileAPI } from '../utils/seafile-api';
import { Utils } from '../utils/utils';
import Group from '../models/group';
import toaster from './toast';
import CreateGroupDialog from '../components/dialog/create-group-dialog';
import FilesSubNav from '../components/files-sub-nav';
import { SUB_NAV_ITEM_HEIGHT } from '../constants';

const propTypes = {
  currentTab: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  tabItemClick: PropTypes.func.isRequired,
  toggleFoldSideNav: PropTypes.func
};

class MainSideNav extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      filesNavUnfolded: false,
      sharedExtended: false,
      groupItems: [],
      isCreateGroupDialogOpen: false,
    };
    this.adminHeight = 0;
    this.filesNavHeight = 0;
  }

  shExtend = () => {
    this.setState({
      sharedExtended: !this.state.sharedExtended,
    });
  };

  loadGroups = () => {
    seafileAPI.listGroups().then(res => {
      let groupList = res.data.map(item => {
        let group = new Group(item);
        return group;
      });

      this.filesNavHeight = (groupList.length + (canAddGroup ? 1 : 0) + (canAddRepo ? 1 : 0) + (canViewOrg ? 1 : 0) + 1) * SUB_NAV_ITEM_HEIGHT;
      this.setState({
        groupItems: groupList.sort((a, b) => {
          return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1;
        })
      });
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

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
  };

  getActiveClass = (tab) => {
    return this.props.currentTab === tab ? 'active' : '';
  };

  onCreateGroup = (groupData) => {
    const newGroup = new Group(groupData);
    const { groupItems: newList } = this.state;
    newList.push(newGroup);
    this.filesNavHeight += SUB_NAV_ITEM_HEIGHT;
    this.setState({
      groupItems: newList
    });
  };

  toggleCreateGroupDialog = () => {
    this.setState({
      isCreateGroupDialogOpen: !this.state.isCreateGroupDialogOpen
    });
  };

  renderAddGroup() {
    return (
      <>
        {canAddGroup && (
          <>
            <li className='nav-item' onClick={this.toggleCreateGroupDialog}>
              <span className="nav-link" role="button">
                <i className="sf2-icon-plus nav-icon" aria-hidden="true"></i>
                {gettext('New Group')}
              </span>
            </li>
            {this.state.isCreateGroupDialogOpen &&
            <CreateGroupDialog
              toggleDialog={this.toggleCreateGroupDialog}
              onCreateGroup={this.onCreateGroup}
            />
            }
          </>
        )}
      </>
    );
  }

  renderSharedAdmin() {
    let height = 0;
    if (this.state.sharedExtended) {
      if (!this.adminHeight) {
        this.adminHeight = 3 * SUB_NAV_ITEM_HEIGHT;
      }
      height = this.adminHeight;
    }
    let style = { height, opacity: height === 0 ? 0 : 1 };

    let linksNavItem = null;
    if (canGenerateShareLink) {
      linksNavItem = (
        <li className={`nav-item ${this.getActiveClass('share-admin-share-links')}`}>
          <Link to={siteRoot + 'share-admin-share-links/'} className={`nav-link ellipsis ${this.getActiveClass('share-admin-share-links')}`} title={gettext('Links')} onClick={(e) => this.tabItemClick(e, 'share-admin-share-links')}>
            <span aria-hidden="true" className="sharp">#</span>
            <span className="nav-text">{gettext('Links')}</span>
          </Link>
        </li>
      );
    } else if (canGenerateUploadLink) {
      linksNavItem = (
        <li className={`nav-item ${this.getActiveClass('share-admin-upload-links')}`}>
          <Link to={siteRoot + 'share-admin-upload-links/'} className={`nav-link ellipsis ${this.getActiveClass('share-admin-upload-links')}`} title={gettext('Links')} onClick={(e) => this.tabItemClick(e, 'share-admin-upload-links')}>
            <span aria-hidden="true" className="sharp">#</span>
            <span className="nav-text">{gettext('Links')}</span>
          </Link>
        </li>
      );
    }
    return (
      <ul
        id="share-admin-sub-nav"
        className={`nav sub-nav nav-pills flex-column ${this.state.sharedExtended ? 'side-panel-slide-share-admin' : 'side-panel-slide-up-share-admin'}`}
        style={style}
      >
        {canAddRepo && canShareRepo && height !== 0 && (
          <li className={`nav-item ${this.getActiveClass('share-admin-libs')}`}>
            <Link to={siteRoot + 'share-admin-libs/'} className={`nav-link ellipsis ${this.getActiveClass('share-admin-libs')}`} title={gettext('Libraries')} onClick={(e) => this.tabItemClick(e, 'share-admin-libs')}>
              <span aria-hidden="true" className="sharp">#</span>
              <span className="nav-text">{gettext('Libraries')}</span>
            </Link>
          </li>
        )}
        {canShareRepo && height !== 0 && (
          <li className={`nav-item ${this.getActiveClass('share-admin-folders')}`}>
            <Link to={siteRoot + 'share-admin-folders/'} className={`nav-link ellipsis ${this.getActiveClass('share-admin-folders')}`} title={gettext('Folders')} onClick={(e) => this.tabItemClick(e, 'share-admin-folders')}>
              <span aria-hidden="true" className="sharp">#</span>
              <span className="nav-text">{gettext('Folders')}</span>
            </Link>
          </li>
        )}
        { height !== 0 && linksNavItem}
      </ul>
    );
  }

  renderCustomNavItems() {
    return (
      customNavItems.map((item, idx) => {
        return (
          <li key={idx} className='nav-item'>
            <a href={item.link} className="nav-link ellipsis" title={item.desc}>
              <span className={item.icon} aria-hidden="true"></span>
              <span className="nav-text">{item.desc}</span>
            </a>
          </li>
        );
      })
    );
  }

  toggleFilesNav = (e) => {
    e.preventDefault();
    e.stopPropagation();
    this.setState({
      filesNavUnfolded: !this.state.filesNavUnfolded
    }, () => {
      if (this.state.filesNavUnfolded) {
        this.loadGroups();
      }
    });
  };

  render() {
    let showActivity = isDocs || isPro || !isDBSqlite3;
    const { filesNavUnfolded, groupItems } = this.state;
    return (
      <div className="side-nav">
        <div className={'side-nav-con d-flex flex-column'}>
          <h2 className="mb-2 px-2 font-weight-normal heading">{gettext('Workspace')}</h2>
          <ul className="nav nav-pills flex-column nav-container">
            <li id="files" className={`nav-item flex-column ${this.getActiveClass('libraries')}`}>
              <Link to={ siteRoot + 'libraries/' } className={`nav-link ellipsis ${this.getActiveClass('libraries')}`} title={gettext('Files')} onClick={(e) => this.tabItemClick(e, 'libraries')}>
                <span className="sf3-font-files sf3-font" aria-hidden="true"></span>
                <span className="nav-text">{gettext('Files')}</span>
                <span className={`toggle-icon sf3-font sf3-font-down ${filesNavUnfolded ? '' : 'rotate-90'}`} aria-hidden="true" onClick={this.toggleFilesNav}></span>
              </Link>
              <ul id="files-sub-nav" className={`nav sub-nav nav-pills flex-column ${filesNavUnfolded ? 'side-panel-slide' : 'side-panel-slide-up'}`} style={{ height: filesNavUnfolded ? this.filesNavHeight : 0, opacity: filesNavUnfolded ? 1 : 0 }}>
                <FilesSubNav
                  groupItems={groupItems}
                  tabItemClick={this.tabItemClick}
                  currentTab={this.props.currentTab}
                />
                {this.renderAddGroup()}
              </ul>
            </li>

            <li className={`nav-item ${this.getActiveClass('starred')}`}>
              <Link className={`nav-link ellipsis ${this.getActiveClass('starred')}`} to={siteRoot + 'starred/'} title={gettext('Favorites')} onClick={(e) => this.tabItemClick(e, 'starred')}>
                <span className="sf3-font-starred sf3-font" aria-hidden="true"></span>
                <span className="nav-text">{gettext('Favorites')}</span>
              </Link>
            </li>
            {showActivity &&
              <li className={`nav-item ${this.getActiveClass('dashboard')}`}>
                <Link className={`nav-link ellipsis ${this.getActiveClass('dashboard')}`} to={siteRoot + 'dashboard/'} title={gettext('Activities')} onClick={(e) => this.tabItemClick(e, 'dashboard')}>
                  <span className="sf3-font-activities sf3-font" aria-hidden="true"></span>
                  <span className="nav-text">{gettext('Activities')}</span>
                </Link>
              </li>
            }
            <li className={`nav-item ${this.getActiveClass('published')}`}>
              <Link className={`nav-link ellipsis ${this.getActiveClass('published')}`} to={siteRoot + 'published/'} title={gettext('Wikis')} onClick={(e) => this.tabItemClick(e, 'published')}>
                <span className="sf3-font-wiki sf3-font" aria-hidden="true"></span>
                <span className="nav-text">{gettext('Wikis')}</span>
              </Link>
            </li>
            {canInvitePeople &&
            <li className={`nav-item ${this.getActiveClass('invitations')}`}>
              <Link className={`nav-link ellipsis ${this.getActiveClass('invitations')}`} to={siteRoot + 'invitations/'} title={gettext('Invite Guest')} onClick={(e) => this.tabItemClick(e, 'invitations')}>
                <span className="sf3-font-invite-visitors sf3-font" aria-hidden="true"></span>
                <span className="nav-text">{gettext('Invite Guest')}</span>
              </Link>
            </li>
            }
            <li id="share-admin-nav" className='nav-item flex-column'>
              <a className="nav-link ellipsis" title={gettext('Share Admin')} onClick={this.shExtend}>
                <span className="sf3-font-wrench sf3-font" aria-hidden="true"></span>
                <span className="nav-text">{gettext('Share Admin')}</span>
                <span className={`toggle-icon sf3-font sf3-font-down ${this.state.sharedExtended ? '' : 'rotate-90'}`} aria-hidden="true"></span>
              </a>
              {this.renderSharedAdmin()}
            </li>
            {customNavItems && this.renderCustomNavItems()}
          </ul>

          <h2 className="mb-2 pt-1 px-2 font-weight-normal heading">{gettext('Help and resources')}</h2>
          {sideNavFooterCustomHtml ? (
            <div className='side-nav-footer' dangerouslySetInnerHTML={{ __html: sideNavFooterCustomHtml }}></div>
          ) : (
            <ul className="nav nav-pills flex-column nav-container">
              <li className='nav-item'>
                <a className={'nav-link'} href={siteRoot + 'help/'} title={gettext('Help')}>
                  <span className="sf3-font-help sf3-font" aria-hidden="true"></span>
                  <span className="nav-text">{gettext('Help')}</span>
                </a>
              </li>
              {enableTC &&
                <li className='nav-item'>
                  <a href={`${siteRoot}terms/`} className="nav-link">
                    <span className="sf3-font-terms sf3-font" aria-hidden="true"></span>
                    <span className="nav-text">{gettext('Terms')}</span>
                  </a>
                </li>
              }
              {additionalAppBottomLinks && (
                <>
                  {Object.keys(additionalAppBottomLinks).map((key, index) => {
                    return (
                      <a className="nav-link" href={additionalAppBottomLinks[key]}>
                        <span className="sf3-font-terms sf3-font" aria-hidden="true"></span>
                        <span className="nav-text">{key}</span>
                      </a>
                    );
                  })}
                </>
              )}
              <li className='nav-item'>
                <a href={siteRoot + 'download_client_program/'} className="nav-link">
                  <span className="sf3-font-devices sf3-font" aria-hidden="true"></span>
                  <span className="nav-text">{gettext('Clients')}</span>
                </a>
              </li>
            </ul>
          )
          }

          <div className="side-nav-bottom-toolbar d-none d-md-flex mt-auto px-2 rounded flex-shrink-0 align-items-center" onClick={this.props.toggleFoldSideNav}>
            <img className="mr-2" src={`${mediaUrl}img/close-sidebar.svg`} width="20" alt="" />
            <span>{gettext('Fold the sidebar')}</span>
          </div>

        </div>
      </div>
    );
  }
}

MainSideNav.propTypes = propTypes;

export default MainSideNav;
