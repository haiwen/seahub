import React from 'react';
import PropTypes from 'prop-types';
import { Link } from '@reach/router';
import Logo from '../../components/logo';
import { gettext, siteRoot, isPro, isDefaultAdmin, canViewSystemInfo, canViewStatistic,
  canConfigSystem, canManageLibrary, canManageUser, canManageGroup, canViewUserLog,
  canViewAdminLog, constanceEnabled, multiTenancy, multiInstitution, sysadminExtraEnabled,
  enableGuestInvitation, enableTermsAndConditions, enableFileScan, enableWorkWeixin } from '../../utils/constants';

const propTypes = {
  isSidePanelClosed: PropTypes.bool.isRequired,
  onCloseSidePanel: PropTypes.func.isRequired,
  currentTab: PropTypes.string.isRequired,
  tabItemClick: PropTypes.func.isRequired
};

class SidePanel extends React.Component {

  getActiveClass = (tab) => {
    return this.props.currentTab == tab ? 'active' : '';
  }

  render() {
    return (
      <div className={`side-panel ${this.props.isSidePanelClosed ? '' : 'left-zero'}`}>
        <div className="side-panel-north">
          <Logo onCloseSidePanel={this.props.onCloseSidePanel}/>
        </div>
        <div className="side-panel-center">
          <div className="side-nav">
            <div className="side-nav-con">
              <h3 className="sf-heading">{gettext('System Admin')}</h3>
              <ul className="nav nav-pills flex-column nav-container">
                {canViewSystemInfo &&
                <li className="nav-item">
                  <Link
                    className={`nav-link ellipsis ${this.getActiveClass('info')}`}
                    to={siteRoot + 'sys/info/'}
                    onClick={() => this.props.tabItemClick('info')}
                  >
                    <span className="sf2-icon-info" aria-hidden="true"></span>
                    <span className="nav-text">{gettext('Info')}</span>
                  </Link>
                </li>
                }
                {isPro && canViewStatistic &&
                  <li className="nav-item">
                    <a className='nav-link ellipsis' href={siteRoot + 'sys/statistic/file/'}>
                      <span className="sf2-icon-histogram" aria-hidden="true"></span>
                      <span className="nav-text">{gettext('Statistic')}</span>
                    </a>
                  </li>
                }
                {isDefaultAdmin &&
                  <li className="nav-item">
                    <Link
                      className={`nav-link ellipsis ${this.getActiveClass('devices')}`}
                      to={siteRoot + 'sys/desktop-devices/'}
                      onClick={() => this.props.tabItemClick('devices')}
                    >
                      <span className="sf2-icon-monitor" aria-hidden="true"></span>
                      <span className="nav-text">{gettext('Devices')}</span>
                    </Link>
                  </li>
                }
                {constanceEnabled && canConfigSystem &&
                  <li className="nav-item">
                    <Link 
                      className={`nav-link ellipsis ${this.getActiveClass('web-settings')}`}
                      to={siteRoot + 'sys/web-settings/'}
                      onClick={() => this.props.tabItemClick('web-settings')}
                    >
                      <span className="sf2-icon-cog2" aria-hidden="true"></span>
                      <span className="nav-text">{gettext('Settings')}</span>
                    </Link>
                  </li>
                }
                {canManageLibrary &&
                  <li className="nav-item">
                    <Link
                      className={`nav-link ellipsis ${this.getActiveClass('libraries')}`}
                      to={siteRoot + 'sys/all-libraries/'}
                      onClick={() => this.props.tabItemClick('libraries')}
                    >
                      <span className="sf2-icon-library" aria-hidden="true"></span>
                      <span className="nav-text">{gettext('Libraries')}</span>
                    </Link>
                  </li>
                }
                {canManageUser &&
                  <li className="nav-item">
                    <a className='nav-link ellipsis' href={siteRoot + 'sys/useradmin/'}>
                      <span className="sf2-icon-user" aria-hidden="true"></span>
                      <span className="nav-text">{gettext('Users')}</span>
                    </a>
                  </li>
                }
                {canManageGroup &&
                  <li className="nav-item">
                    <Link 
                      className={`nav-link ellipsis ${this.getActiveClass('groups')}`}
                      to={siteRoot + 'sys/groups/'}
                      onClick={() => this.props.tabItemClick('groups')}
                    >
                      <span className="sf2-icon-group" aria-hidden="true"></span>
                      <span className="nav-text">{gettext('Groups')}</span>
                    </Link>
                  </li>
                }
                {isPro && canManageGroup &&
                  <li className="nav-item">
                    <a className='nav-link ellipsis' href={siteRoot + 'sysadmin/#address-book/'}>
                      <span className="sf2-icon-organization" aria-hidden="true"></span>
                      <span className="nav-text">{gettext('Departments')}</span>
                    </a>
                  </li>
                }
                {multiTenancy && isDefaultAdmin &&
                  <li className="nav-item">
                    <a className='nav-link ellipsis' href={siteRoot + 'sys/orgadmin/'}>
                      <span className="sf2-icon-organization" aria-hidden="true"></span>
                      <span className="nav-text">{gettext('Organizations')}</span>
                    </a>
                  </li>
                }
                {multiInstitution && isDefaultAdmin &&
                  <li className="nav-item">
                    <a className='nav-link ellipsis' href={siteRoot + 'sys/instadmin/'}>
                      <span className="sf2-icon-organization" aria-hidden="true"></span>
                      <span className="nav-text">{gettext('Institutions')}</span>
                    </a>
                  </li>
                }
                {isDefaultAdmin &&
                  <li className="nav-item">
                    <Link
                      className={`nav-link ellipsis ${this.getActiveClass('notifications')}`}
                      to={siteRoot + 'sys/notifications/'}
                      onClick={() => this.props.tabItemClick('notifications')}
                    >
                      <span className="sf2-icon-msgs" aria-hidden="true"></span>
                      <span className="nav-text">{gettext('Notifications')}</span>
                    </Link>
                  </li>
                }
                {isDefaultAdmin &&
                  <li className="nav-item">
                    <Link
                      className={`nav-link ellipsis ${this.getActiveClass('links')}`}
                      to={siteRoot + 'sys/share-links/'}
                      onClick={() => this.props.tabItemClick('links')}
                    >
                      <span className="sf2-icon-msgs" aria-hidden="true"></span>
                      <span className="nav-text">{gettext('Links')}</span>
                    </Link>
                  </li>
                }
                {sysadminExtraEnabled && canViewUserLog &&
                  <li className="nav-item">
                    <a className='nav-link ellipsis' href={siteRoot + 'sys/loginadmin/'}>
                      <span className="sf2-icon-clock" aria-hidden="true"></span>
                      <span className="nav-text">{gettext('Logs')}</span>
                    </a>
                  </li>
                }
                {isPro && isDefaultAdmin && enableFileScan &&
                  <li className="nav-item">
                    <Link
                      className={`nav-link ellipsis ${this.getActiveClass('file-scan-records')}`}
                      to={siteRoot + 'sys/file-scan-records/'}
                      onClick={() => this.props.tabItemClick('file-scan-records')}
                    >
                      <span className="sf2-icon-security" aria-hidden="true"></span>
                      <span className="nav-text">{gettext('File Scan')}</span>
                    </Link>
                  </li>
                }
                {isPro && isDefaultAdmin &&
                  <li className="nav-item">
                    <a className='nav-link ellipsis' href={siteRoot + 'sys/virus_scan_records/'}>
                      <span className="sf2-icon-security" aria-hidden="true"></span>
                      <span className="nav-text">{gettext('Virus Scan')}</span>
                    </a>
                  </li>
                }
                {enableGuestInvitation && isDefaultAdmin &&
                  <li className="nav-item">
                    <a className='nav-link ellipsis' href={siteRoot + 'sys/invitationadmin/'}>
                      <span className="sf2-icon-invite" aria-hidden="true"></span>
                      <span className="nav-text">{gettext('Invitations')}</span>
                    </a>
                  </li>
                }
                {isDefaultAdmin && enableTermsAndConditions &&
                  <li className="nav-item">
                    <a className='nav-link ellipsis' href={siteRoot + 'sys/termsadmin/'}>
                      <span className="sf2-icon-wiki" aria-hidden="true"></span>
                      <span className="nav-text">{gettext('Terms and Conditions')}</span>
                    </a>
                  </li>
                }
                {isPro && canViewAdminLog &&
                  <li className="nav-item">
                    <a className='nav-link ellipsis' href={siteRoot + 'sysadmin/#admin-operation-logs/'}>
                      <span className="sf2-icon-admin-log" aria-hidden="true"></span>
                      <span className="nav-text">{gettext('Admin Logs')}</span>
                    </a>
                  </li>
                }
                {isDefaultAdmin && enableWorkWeixin &&
                  <li className="nav-item">
                    <Link
                      className={`nav-link ellipsis ${this.getActiveClass('work-weixin')}`}
                      to={siteRoot + 'sys/work-weixin/'}
                      onClick={() => this.props.tabItemClick('work-weixin')}
                    >
                      <span className="sf3-font-enterprise-wechat sf3-font" aria-hidden="true"></span>
                      <span className="nav-text">{'企业微信集成'}</span>
                    </Link>
                  </li>
                }
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

SidePanel.propTypes = propTypes;

export default SidePanel;
