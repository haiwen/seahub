import React from 'react';
import PropTypes from 'prop-types';
import { Link } from '@gatsbyjs/reach-router';
import { gettext, siteRoot, canInvitePeople, enableTC, sideNavFooterCustomHtml, additionalAppBottomLinks,
  isDocs, isPro, isDBSqlite3, customNavItems, mediaUrl, curNoteMsg } from '../utils/constants';
import { SIDE_PANEL_FOLDED_WIDTH, SUB_NAV_ITEM_HEIGHT } from '../constants';
import Tip from './side-nav-icon-tip';
import FilesSubNav from '../components/files-sub-nav';
import { seafileAPI } from '../utils/seafile-api';
import { Utils } from '../utils/utils';
import Group from '../models/group';
import toaster from './toast';
import { FOLDED_SIDE_NAV_FILES, FOLDED_SIDE_NAV } from '../constants/zIndexes';


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
      isFilesSubNavShown: false
    };
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

  render() {
    let showActivity = isDocs || isPro || !isDBSqlite3;
    const { groupItems, isFilesSubNavShown } = this.state;
    return (
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
                >
                  <span className="sf3-font-files sf3-font mr-0" aria-hidden="true"></span>
                </Link>
              </li>

              <li className={`nav-item ${this.getActiveClass('starred')}`} onMouseEnter={this.closeSubNav}>
                <Link className={`nav-link ellipsis ${this.getActiveClass('starred')}`} to={siteRoot + 'starred/'} onClick={(e) => this.tabItemClick(e, 'starred')}>
                  <span className="sf3-font-starred sf3-font mr-0" aria-hidden="true" id="main-side-nav-folded-starred"></span>
                  <Tip target="main-side-nav-folded-starred" text={gettext('Favorites')} />
                </Link>
              </li>

              {showActivity &&
                <>
                  <li className={`nav-item ${this.getActiveClass('dashboard')}`} onMouseEnter={this.closeSubNav}>
                    <Link
                      className={`nav-link ellipsis ${this.getActiveClass('dashboard')}`}
                      to={siteRoot + 'dashboard/'}
                      onClick={(e) => this.tabItemClick(e, 'dashboard')}
                    >
                      <span className="sf3-font-activities sf3-font mr-0" aria-hidden="true" id="main-side-nav-folded-dashboard"></span>
                      <Tip target="main-side-nav-folded-dashboard" text={gettext('Activities')} />
                    </Link>
                  </li>
                </>
              }

              <li className={`nav-item ${this.getActiveClass('published')}`} onMouseEnter={this.closeSubNav}>
                <Link
                  className={`nav-link ellipsis ${this.getActiveClass('published')}`}
                  to={siteRoot + 'published/'}
                  onClick={(e) => this.tabItemClick(e, 'published')}
                >
                  <span className="sf3-font-wiki sf3-font mr-0" aria-hidden="true" id="main-side-nav-folded-wikis"></span>
                  <Tip target="main-side-nav-folded-wikis" text={gettext('Wikis')} />
                </Link>
              </li>

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
                      <a href={item.link} className="nav-link ellipsis" title={item.desc}>
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
                      <a href={`${siteRoot}terms/`} className="nav-link">
                        <span className="sf3-font-terms sf3-font mr-0" aria-hidden="true" id="main-side-nav-folded-terms"></span>
                        <Tip target="main-side-nav-folded-terms" text={gettext('Terms')} />
                      </a>
                    </li>
                  </>
                }
                {additionalAppBottomLinks && (
                  <>
                    {Object.keys(additionalAppBottomLinks).map((key, index) => {
                      return (
                        <a className="nav-link" href={additionalAppBottomLinks[key]}>
                          <span className="sf3-font-terms sf3-font mr-0" aria-hidden="true"></span>
                        </a>
                      );
                    })}
                  </>
                )}
                <li className='nav-item'>
                  <a href={siteRoot + 'download_client_program/'} className="nav-link">
                    <span className="sf3-font-devices sf3-font mr-0" aria-hidden="true" id="main-side-nav-folded-clients"></span>
                    <Tip target="main-side-nav-folded-clients" text={gettext('Clients')} />
                  </a>
                </li>
              </ul>
            }
            <div
              className="side-nav-bottom-toolbar d-none d-md-flex mt-auto px-2 rounded flex-shrink-0 align-items-center"
              onClick={this.props.toggleFoldSideNav}
            >
              <img src={`${mediaUrl}img/open-sidebar.svg`} width="20" alt="" title={gettext('Unfold the sidebar')} />
            </div>
          </div>
        </div>
      </div>
    );
  }
}

MainSideNavFolded.propTypes = propTypes;

export default MainSideNavFolded;
