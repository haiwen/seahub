import React from 'react';
import PropTypes from 'prop-types';
import { Link } from '@reach/router';
import Logo from '../../components/logo';
import { gettext, siteRoot, isPro, isDefaultAdmin, canViewSystemInfo, canViewStatistic,
        canConfigSystem, canManageLibrary, canManageUser, canManageGroup, canViewUserLog,
        canViewAdminLog, constanceEnabled, multiTenancy, multiInstitution, sysadminExtraEnabled,
        enableGuestInvitation, enableTermsAndConditions } from '../../utils/constants';

const propTypes = {
  isSidePanelClosed: PropTypes.bool.isRequired,
  onCloseSidePanel: PropTypes.func.isRequired,
};

class SidePanel extends React.Component {

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
                    <a className='nav-link ellipsis' href={siteRoot + "sysadmin/#dashboard/"}>
                      <span className="sf2-icon-info" aria-hidden="true"></span>
                      <span className="nav-text">{gettext('Info')}</span>
                    </a>
                  </li>
                }
                {isPro && canViewStatistic &&
                  <li className="nav-item">
                    <a className='nav-link ellipsis' href={siteRoot + "sys/statistic/file/"}>
                      <span className="sf2-icon-histogram" aria-hidden="true"></span>
                      <span className="nav-text">{gettext('Statistic')}</span>
                    </a>
                  </li>
                }
                {isDefaultAdmin &&
                  <li className="nav-item">
                    <a className='nav-link ellipsis' href={siteRoot + "sysadmin/#desktop-devices/"}>
                      <span className="sf2-icon-monitor" aria-hidden="true"></span>
                      <span className="nav-text">{gettext('Devices')}</span>
                    </a>
                  </li>
                }
                {constanceEnabled && canConfigSystem &&
                  <li className="nav-item">
                    <a className='nav-link ellipsis' href={siteRoot + "sys/settings/"}>
                      <span className="sf2-icon-cog2" aria-hidden="true"></span>
                      <span className="nav-text">{gettext('Settings')}</span>
                    </a>
                  </li>
                }
                {canManageLibrary &&
                  <li className="nav-item">
                    <a className='nav-link ellipsis' href={siteRoot + "sysadmin/#all-libs/"}>
                      <span className="sf2-icon-library" aria-hidden="true"></span>
                      <span className="nav-text">{gettext('Libraries')}</span>
                    </a>
                  </li>
                }
                {canManageUser &&
                  <li className="nav-item">
                    <a className='nav-link ellipsis' href={siteRoot + "sys/useradmin/"}>
                      <span className="sf2-icon-user" aria-hidden="true"></span>
                      <span className="nav-text">{gettext('Users')}</span>
                    </a>
                  </li>
                }
                {canManageGroup &&
                  <li className="nav-item">
                    <a className='nav-link ellipsis' href={siteRoot + "sysadmin/#groups/"}>
                      <span className="sf2-icon-group" aria-hidden="true"></span>
                      <span className="nav-text">{gettext('Groups')}</span>
                    </a>
                  </li>
                }
                {isPro && canManageGroup &&
                  <li className="nav-item">
                    <a className='nav-link ellipsis' href={siteRoot + "sysadmin/#address-book/"}>
                      <span className="sf2-icon-organization" aria-hidden="true"></span>
                      <span className="nav-text">{gettext('Departments')}</span>
                    </a>
                  </li>
                }
                {multiTenancy && isDefaultAdmin &&
                  <li className="nav-item">
                    <a className='nav-link ellipsis' href={siteRoot + "sys/orgadmin/"}>
                      <span className="sf2-icon-organization" aria-hidden="true"></span>
                      <span className="nav-text">{gettext('Organizations')}</span>
                    </a>
                  </li>
                }
                {multiInstitution && isDefaultAdmin &&
                  <li className="nav-item">
                    <a className='nav-link ellipsis' href={siteRoot + "sys/instadmin/"}>
                      <span className="sf2-icon-organization" aria-hidden="true"></span>
                      <span className="nav-text">{gettext('Institutions')}</span>
                    </a>
                  </li>
                }
                {isDefaultAdmin &&
                  <li className="nav-item">
                    <a className='nav-link ellipsis' href={siteRoot + "sys/notificationadmin/"}>
                      <span className="sf2-icon-msgs" aria-hidden="true"></span>
                      <span className="nav-text">{gettext('Notifications')}</span>
                    </a>
                  </li>
                }
                {isDefaultAdmin &&
                  <li className="nav-item">
                    <a className='nav-link ellipsis' href={siteRoot + "sys/publinkadmin/"}>
                      <span className="sf2-icon-link" aria-hidden="true"></span>
                      <span className="nav-text">{gettext('Links')}</span>
                    </a>
                  </li>
                }
                {sysadminExtraEnabled && canViewUserLog &&
                  <li className="nav-item">
                    <a className='nav-link ellipsis' href={siteRoot + "sys/loginadmin/"}>
                      <span className="sf2-icon-clock" aria-hidden="true"></span>
                      <span className="nav-text">{gettext('Logs')}</span>
                    </a>
                  </li>
                }
                {isPro && isDefaultAdmin &&
                  <li className="nav-item">
                    <Link className='nav-link ellipsis' to={siteRoot + "sys/file-scan-records/"}>
                      <span className="sf2-icon-security" aria-hidden="true"></span>
                      <span className="nav-text">{gettext('File Scan')}</span>
                    </Link>
                  </li>
                }
                {isPro && isDefaultAdmin &&
                  <li className="nav-item">
                    <a className='nav-link ellipsis' href={siteRoot + "sys/virus_scan_records/"}>
                      <span className="sf2-icon-security" aria-hidden="true"></span>
                      <span className="nav-text">{gettext('Virus Scan')}</span>
                    </a>
                  </li>
                }
                {enableGuestInvitation && isDefaultAdmin &&
                  <li className="nav-item">
                    <a className='nav-link ellipsis' href={siteRoot + "sys/invitationadmin/"}>
                      <span className="sf2-icon-invite" aria-hidden="true"></span>
                      <span className="nav-text">{gettext('Invitations')}</span>
                    </a>
                  </li>
                }
                {isDefaultAdmin && enableTermsAndConditions &&
                  <li className="nav-item">
                    <a className='nav-link ellipsis' href={siteRoot + "sys/termsadmin/"}>
                      <span className="sf2-icon-wiki" aria-hidden="true"></span>
                      <span className="nav-text">{gettext('Terms and Conditions')}</span>
                    </a>
                  </li>
                }
                {isPro && canViewAdminLog &&
                  <li className="nav-item">
                    <a className='nav-link ellipsis' href={siteRoot + "sysadmin/#admin-operation-logs/"}>
                      <span className="sf2-icon-admin-log" aria-hidden="true"></span>
                      <span className="nav-text">{gettext('Admin Logs')}</span>
                    </a>
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
