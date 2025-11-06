import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import ModalPortal from './modal-portal';
import { Link } from '@gatsbyjs/reach-router';
import {
  gettext, siteRoot, canAddGroup, canAddRepo, canShareRepo,
  canGenerateShareLink, canGenerateUploadLink, canInvitePeople,
  enableTC, sideNavFooterCustomHtml, enableShowAbout, showWechatSupportGroup,
  canViewOrg, enableOCM, enableOCMViaWebdav, canCreateWiki,
  isPro, isDBSqlite3, customNavItems, helpLink
} from '../utils/constants';
import { seafileAPI } from '../utils/seafile-api';
import { Utils } from '../utils/utils';
import Group from '../models/group';
import toaster from './toast';
import CreateGroupDialog from '../components/dialog/create-group-dialog';
import AboutDialog from './dialog/about-dialog';
import FilesSubNav from '../components/files-sub-nav';
import { SUB_NAV_ITEM_HEIGHT } from '../constants';
import { isWorkWeixin } from './wechat/weixin-utils';
import WechatDialog from './wechat/wechat-dialog';
import { EVENT_BUS_TYPE } from './common/event-bus-type';
import EventBus from './common/event-bus';
import OpIcon from '../components/op-icon';
import Icon from '../components/icon';

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
      isAboutDialogShow: false,
      sharedExtended: false,
      groupItems: [],
      isCreateGroupDialogOpen: false,
      isShowWechatDialog: false,
    };
    this.adminHeight = 0;
    this.filesNavHeight = 0;
    this.isWorkWeixin = isWorkWeixin(window.navigator.userAgent.toLowerCase());
  }

  toggleWechatDialog = () => {
    this.setState({ isShowWechatDialog: !this.state.isShowWechatDialog });
  };

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

      this.filesNavHeight = (groupList.length + (canAddGroup ? 1 : 0) + (canAddRepo ? 1 : 0) + (canViewOrg ? 1 : 0) + (enableOCM ? 1 : 0) + (enableOCMViaWebdav ? 1 : 0) + 1) * SUB_NAV_ITEM_HEIGHT;
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

    const eventBus = EventBus.getInstance();
    eventBus.dispatch(EVENT_BUS_TYPE.ADD_NEW_GROUP, { group: newGroup });

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
            <li
              className='nav-item'
              onClick={this.toggleCreateGroupDialog}
              tabIndex={0}
              role="button"
              aria-label={gettext('New Group')}
              onKeyDown={Utils.onKeyDown}
            >
              <span className="nav-link">
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

  toggleAboutDialog = () => {
    this.setState({ isAboutDialogShow: !this.state.isAboutDialogShow });
  };

  render() {
    let showActivity = isPro || !isDBSqlite3;
    const { filesNavUnfolded, groupItems } = this.state;
    return (
      <Fragment>
        <div className="side-nav">
          <div className={'side-nav-con d-flex flex-column'}>
            <h2 className="mb-2 px-2 font-weight-normal heading">{gettext('Workspace')}</h2>
            <ul className="nav nav-pills flex-column nav-container">
              <li id="files" className={`nav-item flex-column ${this.getActiveClass('libraries')}`}>
                <Link to={ siteRoot + 'libraries/' } className={`nav-link ellipsis ${this.getActiveClass('libraries')}`} title={gettext('Files')} onClick={(e) => this.tabItemClick(e, 'libraries')}>
                  <span className="sf3-font-files sf3-font" aria-hidden="true"></span>
                  <span className="nav-text">{gettext('Files')}</span>
                  <OpIcon
                    className={`toggle-icon sf3-font sf3-font-down ${filesNavUnfolded ? '' : 'rotate-90'}`}
                    title={filesNavUnfolded ? gettext('Fold') : gettext('Unfold')}
                    op={this.toggleFilesNav}
                  />
                </Link>
                <ul
                  id="files-sub-nav"
                  className={`nav sub-nav nav-pills flex-column ${filesNavUnfolded ? 'side-panel-slide' : 'side-panel-slide-up'}`}
                  style={ filesNavUnfolded ? { height: this.filesNavHeight, 'opacity': 1 } : { 'height': 0, 'opacity': 0 }}
                >
                  {filesNavUnfolded && (
                    <>
                      <FilesSubNav
                        groupItems={groupItems}
                        tabItemClick={this.tabItemClick}
                        currentTab={this.props.currentTab}
                      />
                      {this.renderAddGroup()}
                    </>
                  )}
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
                <Link className={`nav-link ellipsis ${this.getActiveClass('dashboard')}`} to={siteRoot + 'activities/all'} title={gettext('Activities')} onClick={(e) => this.tabItemClick(e, 'dashboard')}>
                  <span className="sf3-font-activities sf3-font" aria-hidden="true"></span>
                  <span className="nav-text">{gettext('Activities')}</span>
                </Link>
              </li>
              }
              {canCreateWiki &&
              <li className={`nav-item ${this.getActiveClass('published')}`}>
                <Link className={`nav-link ellipsis ${this.getActiveClass('published')}`} to={siteRoot + 'published/'} title={gettext('Wikis')} onClick={(e) => this.tabItemClick(e, 'published')}>
                  <span className="sf3-font-wiki sf3-font" aria-hidden="true"></span>
                  <span className="nav-text">{gettext('Wikis')}</span>
                </Link>
              </li>
              }
              {canInvitePeople &&
              <li className={`nav-item ${this.getActiveClass('invitations')}`}>
                <Link className={`nav-link ellipsis ${this.getActiveClass('invitations')}`} to={siteRoot + 'invitations/'} title={gettext('Invite Guest')} onClick={(e) => this.tabItemClick(e, 'invitations')}>
                  <span className="sf3-font-invite-visitors sf3-font" aria-hidden="true"></span>
                  <span className="nav-text">{gettext('Invite Guest')}</span>
                </Link>
              </li>
              }
              <li id="share-admin-nav" className='nav-item flex-column'>
                <div
                  className="nav-link ellipsis"
                  title={gettext('Share Admin')}
                  onClick={this.shExtend}
                  tabIndex={0}
                  role="button"
                  onKeyDown={Utils.onKeyDown}
                >
                  <span className="sf3-font-wrench sf3-font" aria-hidden="true"></span>
                  <span className="nav-text">{gettext('Share Admin')}</span>
                  <span className={`toggle-icon sf3-font sf3-font-down ${this.state.sharedExtended ? '' : 'rotate-90'}`}></span>
                </div>
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
                  <a className={'nav-link'} href={helpLink || siteRoot + 'help/'} title={gettext('Help')}>
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
                <li className='nav-item'>
                  <a href={siteRoot + 'download_client_program/'} className="nav-link">
                    <span className="sf3-font-devices sf3-font" aria-hidden="true"></span>
                    <span className="nav-text">{gettext('Clients')}</span>
                  </a>
                </li>
                {enableShowAbout &&
                <li className='nav-item'>
                  <div
                    className="nav-link"
                    onClick={this.toggleAboutDialog}
                    tabIndex={0}
                    role="button"
                    onKeyDown={Utils.onKeyDown}
                  >
                    <span className="sf3-font-about sf3-font" aria-hidden="true"></span>
                    <span className="nav-text">{gettext('About')}</span>
                  </div>
                </li>
                }
                {showWechatSupportGroup &&
                <li className='nav-item'>
                  <div
                    className="nav-link"
                    onClick={this.toggleWechatDialog}
                    tabIndex={0}
                    role="button"
                    onKeyDown={Utils.onKeyDown}
                  >
                    <span className="sf3-font-hi sf3-font" aria-hidden="true"></span>
                    <span className="nav-text">
                      {`加入${this.isWorkWeixin ? '企业' : ''}微信咨询群`}
                    </span>
                  </div>
                </li>
                }
              </ul>
            )
            }
            <div
              className="side-nav-bottom-toolbar d-none d-md-flex mt-auto px-2 rounded flex-shrink-0 align-items-center"
              onClick={this.props.toggleFoldSideNav}
              tabIndex={0}
              role="button"
              onKeyDown={Utils.onKeyDown}
            >
              <Icon className="mr-2" symbol="close-sidebar" />
              <span>{gettext('Fold the sidebar')}</span>
            </div>
          </div>
        </div>
        {this.state.isAboutDialogShow && enableShowAbout && (
          <ModalPortal>
            <AboutDialog onCloseAboutDialog={this.toggleAboutDialog} />
          </ModalPortal>
        )}
        {this.state.isShowWechatDialog &&
          <ModalPortal>
            <WechatDialog toggleWechatDialog={this.toggleWechatDialog}/>
          </ModalPortal>
        }
      </Fragment>
    );
  }
}

MainSideNav.propTypes = propTypes;

export default MainSideNav;
