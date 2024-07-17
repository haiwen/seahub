import React from 'react';
import PropTypes from 'prop-types';
import { Link } from '@gatsbyjs/reach-router';
import { gettext, siteRoot, canInvitePeople, enableTC, sideNavFooterCustomHtml, additionalAppBottomLinks,
  isDocs, isPro, isDBSqlite3, customNavItems, mediaUrl } from '../utils/constants';
import Tip from './side-nav-icon-tip';

import '../css/main-side-nav-folded.css';

const propTypes = {
  currentTab: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  tabItemClick: PropTypes.func.isRequired,
  toggleFoldSideNav: PropTypes.func
};

class MainSideNavFolded extends React.Component {

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

  render() {
    let showActivity = isDocs || isPro || !isDBSqlite3;
    return (
      <div className="side-nav side-nav-folded">
        <div className={'side-nav-con d-flex flex-column'}>
          <ul className="nav nav-pills flex-column nav-container">

            <li id="files" className={`nav-item flex-column ${this.getActiveClass('libraries')}`}>
              <Link to={ siteRoot + 'libraries/' } className={`nav-link ellipsis ${this.getActiveClass('libraries')}`} title={gettext('Files')} onClick={(e) => this.tabItemClick(e, 'libraries')}>
                <span className="sf3-font-files sf3-font" aria-hidden="true"></span>
              </Link>
            </li>
            <Tip target="files" text={gettext('Files')} />

            <li className={`nav-item ${this.getActiveClass('starred')}`} id="main-side-nav-folded-starred">
              <Link className={`nav-link ellipsis ${this.getActiveClass('starred')}`} to={siteRoot + 'starred/'} onClick={(e) => this.tabItemClick(e, 'starred')}>
                <span className="sf3-font-starred sf3-font" aria-hidden="true"></span>
              </Link>
            </li>
            <Tip target="main-side-nav-folded-starred" text={gettext('Favorites')} />

            {showActivity &&
              <>
                <li className={`nav-item ${this.getActiveClass('dashboard')}`} id="main-side-nav-folded-dashboard">
                  <Link className={`nav-link ellipsis ${this.getActiveClass('dashboard')}`} to={siteRoot + 'dashboard/'} onClick={(e) => this.tabItemClick(e, 'dashboard')}>
                    <span className="sf3-font-activities sf3-font" aria-hidden="true"></span>
                  </Link>
                </li>
                <Tip target="main-side-nav-folded-dashboard" text={gettext('Activities')} />
              </>
            }

            <li className={`nav-item ${this.getActiveClass('published')}`} id="main-side-nav-folded-wikis">
              <Link className={`nav-link ellipsis ${this.getActiveClass('published')}`} to={siteRoot + 'published/'} onClick={(e) => this.tabItemClick(e, 'published')}>
                <span className="sf3-font-wiki sf3-font" aria-hidden="true"></span>
              </Link>
            </li>
            <Tip target="main-side-nav-folded-wikis" text={gettext('Wikis')} />

            {canInvitePeople &&
              <>
                <li className={`nav-item ${this.getActiveClass('invitations')}`} id="main-side-nav-folded-invitations">
                  <Link className={`nav-link ellipsis ${this.getActiveClass('invitations')}`} to={siteRoot + 'invitations/'} onClick={(e) => this.tabItemClick(e, 'invitations')}>
                    <span className="sf3-font-invite-visitors sf3-font" aria-hidden="true"></span>
                  </Link>
                </li>
                <Tip target="main-side-nav-folded-invitations" text={gettext('Invite Guest')} />
              </>
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
            <div className='side-nav-footer' dangerouslySetInnerHTML={{__html: sideNavFooterCustomHtml}}></div>
            :
            <ul className="nav nav-pills flex-column nav-container">
              <li className='nav-item' id="main-side-nav-folded-help">
                <a className={'nav-link'} href={siteRoot + 'help/'} title={gettext('Help')}>
                  <span className="sf3-font-help sf3-font" aria-hidden="true"></span>
                </a>
              </li>
              <Tip target="main-side-nav-folded-help" text={gettext('Help')} />
              {enableTC &&
                <>
                  <li className='nav-item' id="main-side-nav-folded-terms">
                    <a href={`${siteRoot}terms/`} className="nav-link">
                      <span className="sf3-font-terms sf3-font" aria-hidden="true"></span>
                    </a>
                  </li>
                  <Tip target="main-side-nav-folded-terms" text={gettext('Terms')} />
                </>
              }
              {additionalAppBottomLinks && (
                <>
                  {Object.keys(additionalAppBottomLinks).map((key, index) => {
                    return (
                      <a className="nav-link" href={additionalAppBottomLinks[key]}>
                        <span className="sf3-font-terms sf3-font" aria-hidden="true"></span>
                      </a>
                    );
                  })}
                </>
              )}
              <li className='nav-item' id="main-side-nav-folded-clients">
                <a href={siteRoot + 'download_client_program/'} className="nav-link">
                  <span className="sf3-font-devices sf3-font" aria-hidden="true"></span>
                </a>
              </li>
              <Tip target="main-side-nav-folded-clients" text={gettext('Clients')} />
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
    );
  }
}

MainSideNavFolded.propTypes = propTypes;

export default MainSideNavFolded;
