import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import ModalPortal from './modal-portal';
import { Link } from '@gatsbyjs/reach-router';
import { gettext, siteRoot, canInvitePeople, canCreateWiki, enableTC, sideNavFooterCustomHtml, showWechatSupportGroup,
  isPro, isDBSqlite3, customNavItems, curNoteMsg, enableShowAbout } from '../utils/constants';
import { SIDE_PANEL_FOLDED_WIDTH, SUB_NAV_ITEM_HEIGHT } from '../constants';
import Tip from './side-nav-icon-tip';
import FilesSubNav from '../components/files-sub-nav';
import AboutDialog from './dialog/about-dialog';
import { seafileAPI } from '../utils/seafile-api';
import { Utils } from '../utils/utils';
import Group from '../models/group';
import toaster from './toast';
import { FOLDED_SIDE_NAV_FILES, FOLDED_SIDE_NAV } from '../constants/zIndexes';
import { isWorkWeixin } from './wechat/weixin-utils';
import WechatDialog from './wechat/wechat-dialog';
import Icon from '../components/icon';

import '../css/main-side-nav-folded.css';

const propTypes = {
  currentTab: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  tabItemClick: PropTypes.func.isRequired,
  eventBus: PropTypes.object,
  toggleFoldSideNav: PropTypes.func
};

class MainSideNavFolded extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      groupItems: [],
      isFilesSubNavShown: false,
      isAboutDialogShow: false,
      isShowWechatDialog: false,
    };
    this.isWorkWeixin = isWorkWeixin(window.navigator.userAgent.toLowerCase());
  }

  componentDidMount() {
    document.addEventListener('click', this.handleOutsideClick);
    this.unsubscribeHeaderEvent = this.props.eventBus.subscribe('top-header-mouse-enter', this.closeSubNav);
    seafileAPI.listGroups().then(res => {
      this.setState({
        groupItems: res.data.map(item => new Group(item)).sort((a, b) => a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1),
      });
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  componentWillUnmount() {
    document.removeEventListener('click', this.handleOutsideClick);
    this.unsubscribeHeaderEvent();
  }

  toggleWechatDialog = () => {
    this.setState({ isShowWechatDialog: !this.state.isShowWechatDialog });
  };


  handleOutsideClick = (e) => {
    const { isFilesSubNavShown } = this.state;
    if (isFilesSubNavShown && !this.filesSubNav.contains(e.target)) {
      this.closeSubNav();
    }
  };

  openSubNav = () => {
    if (this.state.isFilesSubNavShown) return;
    if (curNoteMsg) {
      const infoBar = document.getElementById('info-bar');
      const top = (60 + (infoBar ? infoBar.clientHeight : 0)) + 'px';
      this.filesSubNav.style.top = top;
    }
    this.setState({ isFilesSubNavShown: true });
  };

  closeSubNav = () => {
    if (!this.state.isFilesSubNavShown) return;
    this.setState({ isFilesSubNavShown: false });
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
    this.setState({
      isFilesSubNavShown: false
    });
  };

  getActiveClass = (tab) => {
    return this.props.currentTab === tab ? 'active' : '';
  };

  toggleAboutDialog = () => {
    this.setState({ isAboutDialogShow: !this.state.isAboutDialogShow });
  };

  render() {
    let showActivity = isPro || !isDBSqlite3;
    const { groupItems, isFilesSubNavShown } = this.state;
    return (
      <Fragment>
        <div className='side-nav-folded-container h-100 position-relative'>
          {/* FOLDED SIDE NAV FILES */}
          <div className="side-nav side-nav-folded position-relative" style={{ zIndex: FOLDED_SIDE_NAV_FILES }}>
            <div className='side-nav-con p-0'>
              <div className="nav nav-pills nav-container">
                <ul
                  id="files-sub-nav"
                  className="sub-nav position-fixed rounded border shadow p-4 o-auto"
                  style={{
                    'left': isFilesSubNavShown ? SIDE_PANEL_FOLDED_WIDTH + 4 : '-240px',
                    'maxHeight': SUB_NAV_ITEM_HEIGHT * 10 + 16 * 2,
                    'opacity': isFilesSubNavShown ? 1 : 0,
                  }}
                  ref={ref => this.filesSubNav = ref}
                  onMouseLeave={this.closeSubNav}
                >
                  <FilesSubNav
                    groupItems={groupItems}
                    tabItemClick={this.tabItemClick}
                    currentTab={this.props.currentTab}
                  />
                </ul>
              </div>
            </div>
          </div>
          {/* FOLDED SIDE NAVS */}
          <div className="side-nav side-nav-folded h-100 position-relative" style={{ zIndex: FOLDED_SIDE_NAV }}>
            <div className='side-nav-con d-flex flex-column'>
              <ul className="nav nav-pills flex-column nav-container">
                <li className={`nav-item flex-column ${this.getActiveClass('libraries')}`}>
                  <Link
                    to={ siteRoot + 'libraries/' }
                    className={`nav-link ellipsis ${this.getActiveClass('libraries')}`}
                    onClick={(e) => this.tabItemClick(e, 'libraries')}
                    onMouseEnter={this.openSubNav}
                    aria-label={gettext('Libraries')}
                  >
                    <span className="sf3-font-files sf3-font mr-0" aria-hidden="true"></span>
                  </Link>
                </li>

                <li className={`nav-item ${this.getActiveClass('starred')}`} onMouseEnter={this.closeSubNav}>
                  <Link
                    className={`nav-link ellipsis ${this.getActiveClass('starred')}`}
                    to={siteRoot + 'starred/'}
                    onClick={(e) => this.tabItemClick(e, 'starred')}
                    aria-label={gettext('Favorites')}
                  >
                    <span className="sf3-font-starred sf3-font mr-0" aria-hidden="true" id="main-side-nav-folded-starred"></span>
                    <Tip target="main-side-nav-folded-starred" text={gettext('Favorites')} />
                  </Link>
                </li>

                {showActivity &&
                <>
                  <li className={`nav-item ${this.getActiveClass('dashboard')}`} onMouseEnter={this.closeSubNav}>
                    <Link
                      className={`nav-link ellipsis ${this.getActiveClass('dashboard')}`}
                      to={siteRoot + 'activities/all/'}
                      onClick={(e) => this.tabItemClick(e, 'dashboard')}
                      aria-label={gettext('Activities')}
                    >
                      <span className="sf3-font-activities sf3-font mr-0" aria-hidden="true" id="main-side-nav-folded-dashboard"></span>
                      <Tip target="main-side-nav-folded-dashboard" text={gettext('Activities')} />
                    </Link>
                  </li>
                </>
                }

                {canCreateWiki &&
                <li className={`nav-item ${this.getActiveClass('published')}`} onMouseEnter={this.closeSubNav}>
                  <Link
                    className={`nav-link ellipsis ${this.getActiveClass('published')}`}
                    to={siteRoot + 'published/'}
                    onClick={(e) => this.tabItemClick(e, 'published')}
                    aria-label={gettext('Wikis')}
                  >
                    <span className="sf3-font-wiki sf3-font mr-0" aria-hidden="true" id="main-side-nav-folded-wikis"></span>
                    <Tip target="main-side-nav-folded-wikis" text={gettext('Wikis')} />
                  </Link>
                </li>
                }

                {canInvitePeople &&
                <li className={`nav-item ${this.getActiveClass('invitations')}`} onMouseEnter={this.closeSubNav}>
                  <Link
                    className={`nav-link ellipsis ${this.getActiveClass('invitations')}`}
                    to={siteRoot + 'invitations/'}
                    onClick={(e) => this.tabItemClick(e, 'invitations')}
                  >
                    <span className="sf3-font-invite-visitors sf3-font mr-0" aria-hidden="true" id="main-side-nav-folded-invitations"></span>
                    <Tip target="main-side-nav-folded-invitations" text={gettext('Invite Guest')} />
                  </Link>
                </li>
                }

                {customNavItems &&
                customNavItems.map((item, idx) => {
                  return (
                    <li key={idx} className='nav-item'>
                      <a href={item.link} className="nav-link ellipsis" title={item.desc} aria-label={item.desc}>
                        <span className={item.icon} aria-hidden="true" title={item.desc}></span>
                      </a>
                    </li>
                  );
                })
                }
              </ul>

              {sideNavFooterCustomHtml ?
                <div className='side-nav-footer' dangerouslySetInnerHTML={{ __html: sideNavFooterCustomHtml }}></div>
                :
                <ul className="nav nav-pills flex-column nav-container">
                  <li className='nav-item'>
                    <a className='nav-link' href={siteRoot + 'help/'} title={gettext('Help')}>
                      <span className="sf3-font-help sf3-font mr-0" aria-hidden="true" id="main-side-nav-folded-help"></span>
                      <Tip target="main-side-nav-folded-help" text={gettext('Help')} />
                    </a>
                  </li>
                  {enableTC &&
                  <>
                    <li className='nav-item'>
                      <a href={`${siteRoot}terms/`} className="nav-link" aria-label={gettext('Terms')}>
                        <span className="sf3-font-terms sf3-font mr-0" aria-hidden="true" id="main-side-nav-folded-terms"></span>
                        <Tip target="main-side-nav-folded-terms" text={gettext('Terms')} />
                      </a>
                    </li>
                  </>
                  }
                  <li className='nav-item'>
                    <a href={siteRoot + 'download_client_program/'} className="nav-link" aria-label={gettext('Clients')}>
                      <span className="sf3-font-devices sf3-font mr-0" aria-hidden="true" id="main-side-nav-folded-clients"></span>
                      <Tip target="main-side-nav-folded-clients" text={gettext('Clients')} />
                    </a>
                  </li>
                  {enableShowAbout &&
                  <li className='nav-item'>
                    <div
                      className="nav-link"
                      role="button"
                      tabIndex={0}
                      aria-label={gettext('About')}
                      onClick={this.toggleAboutDialog}
                      onKeyDown={Utils.onKeyDown}
                    >
                      <span className="sf3-font-about sf3-font mr-0" aria-hidden="true" id="main-side-nav-folded-about"></span>
                      <Tip target="main-side-nav-folded-about" text={gettext('About')} />
                    </div>
                  </li>
                  }
                  {showWechatSupportGroup &&
                  <li className='nav-item'>
                    <div
                      className="nav-link"
                      role="button"
                      tabIndex={0}
                      aria-label={`加入${this.isWorkWeixin ? '企业' : ''}微信咨询群`}
                      onClick={this.toggleWechatDialog}
                      onKeyDown={Utils.onKeyDown}
                    >
                      <span className="sf3-font-hi sf3-font mr-0" aria-hidden="true" id="main-side-nav-folded-wechat"></span>
                      <Tip target="main-side-nav-folded-wechat" text={`加入${this.isWorkWeixin ? '企业' : ''}微信咨询群`} />
                    </div>
                  </li>
                  }
                </ul>
              }
              <div
                className="side-nav-bottom-toolbar d-none d-md-flex mt-auto px-2 rounded flex-shrink-0 align-items-center"
                tabIndex={0}
                role="button"
                onClick={this.props.toggleFoldSideNav}
                onKeyDown={Utils.onKeyDown}
                aria-label={gettext('Unfold the sidebar')}
                title={gettext('Unfold the sidebar')}
              >
                <Icon symbol="open-sidebar" className="mr-0" />
              </div>
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

MainSideNavFolded.propTypes = propTypes;

export default MainSideNavFolded;
