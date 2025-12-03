import React from 'react';
import PropTypes from 'prop-types';
import { Link } from '@gatsbyjs/reach-router';
import Logo from '../../components/logo';
import Icon from '../../components/icon';
import { gettext, siteRoot, enableSubscription, enableExternalBillingService, enableMultiADFS } from '../../utils/constants';

const propTypes = {
  isSidePanelClosed: PropTypes.bool.isRequired,
  onCloseSidePanel: PropTypes.func.isRequired,
  currentTab: PropTypes.string.isRequired,
  tabItemClick: PropTypes.func.isRequired
};

class SidePanel extends React.Component {

  getActiveClass = (tab) => {
    return this.props.currentTab == tab ? 'active' : '';
  };

  tabItemClick = (tab) => {
    this.props.tabItemClick(tab);
  };

  render() {
    return (
      <div className={`side-panel ${this.props.isSidePanelClosed ? '' : 'left-zero'}`}>
        <div className="side-panel-north">
          <Logo onCloseSidePanel={this.props.onCloseSidePanel}/>
        </div>
        <div className="side-panel-center">
          <div className="side-nav">
            <div className="side-nav-con">
              <h3 className="sf-heading" style={{ 'color': '#f7941d' }}>{gettext('Admin')}</h3>
              <ul className="nav nav-pills flex-column nav-container">
                <li className={`nav-item ${this.getActiveClass('info')}`}>
                  <Link className={`nav-link ellipsis ${this.getActiveClass('info')}`} to={siteRoot + 'org/info/'} onClick={() => this.tabItemClick('info')} >
                    <Icon symbol="about" />
                    <span className="nav-text">{gettext('Info')}</span>
                  </Link>
                </li>
                <li className={`nav-item ${this.getActiveClass('statistics-admin')}`}>
                  <Link className={`nav-link ellipsis ${this.getActiveClass('statistics-admin')}`} to={siteRoot + 'org/statistics-admin/file/'} onClick={() => this.tabItemClick('statistics-admin')} >
                    <Icon symbol="statistic" />
                    <span className="nav-text">{gettext('Statistic')}</span>
                  </Link>
                </li>
                <li className={`nav-item ${this.getActiveClass('deviceadmin')}`}>
                  <Link className={`nav-link ellipsis ${this.getActiveClass('deviceadmin')}`} to={siteRoot + 'org/deviceadmin/desktop-devices/'} onClick={() => this.tabItemClick('deviceadmin')} >
                    <Icon symbol="devices" />
                    <span className="nav-text">{gettext('Devices')}</span>
                  </Link>
                </li>
                <li className={`nav-item ${this.getActiveClass('web-settings')}`}>
                  <Link className={`nav-link ellipsis ${this.getActiveClass('web-settings')}`} to={siteRoot + 'org/web-settings/'} onClick={() => this.tabItemClick('web-settings')} >
                    <Icon symbol="settings" />
                    <span className="nav-text">{gettext('Settings')}</span>
                  </Link>
                </li>
                <li className={`nav-item ${this.getActiveClass('repoadmin')}`}>
                  <Link className={`nav-link ellipsis ${this.getActiveClass('repoadmin')}`} to={siteRoot + 'org/repoadmin/'} onClick={() => this.tabItemClick('repoadmin')} >
                    <Icon symbol="libraries" />
                    <span className="nav-text">{gettext('Libraries')}</span>
                  </Link>
                </li>
                <li className={`nav-item ${this.getActiveClass('users')}`}>
                  <Link className={`nav-link ellipsis ${this.getActiveClass('users') || this.getActiveClass('admins')}`} to={siteRoot + 'org/useradmin/'} onClick={() => this.tabItemClick('users')} >
                    <Icon symbol="user" />
                    <span className="nav-text">{gettext('Users')}</span>
                  </Link>
                </li>
                <li className={`nav-item ${this.getActiveClass('groupadmin')}`}>
                  <Link className={`nav-link ellipsis ${this.getActiveClass('groupadmin')}`} to={siteRoot + 'org/groupadmin/'} onClick={() => this.tabItemClick('groupadmin')}>
                    <Icon symbol="groups" />
                    <span className="nav-text">{gettext('Groups')}</span>
                  </Link>
                </li>
                <li className={`nav-item ${this.getActiveClass('departmentadmin')}`}>
                  <Link className={`nav-link ellipsis ${this.getActiveClass('departmentadmin')}`} to={siteRoot + 'org/departmentadmin/'} onClick={() => this.tabItemClick('departmentadmin')} >
                    <Icon symbol="department" />
                    <span className="nav-text">{gettext('Departments')}</span>
                  </Link>
                </li>
                {enableSubscription &&
                  <li className={`nav-item ${this.getActiveClass('subscription')}`}>
                    <Link className={`nav-link ellipsis ${this.getActiveClass('subscription')}`} to={siteRoot + 'org/subscription/'} onClick={() => this.tabItemClick('subscription')} >
                      <Icon symbol='currency' />
                      <span className="nav-text">{'付费管理'}</span>
                    </Link>
                  </li>
                }
                {enableExternalBillingService &&
                  <li className={`nav-item ${this.getActiveClass('billing')}`}>
                    <a href={siteRoot + 'billing/'} target="_blank" rel="noreferrer" className="nav-link">
                      <Icon symbol='currency' />
                      <span className="nav-text">{gettext('Billing')}</span>
                    </a>
                  </li>
                }
                <li className={`nav-item ${this.getActiveClass('publinkadmin')}`}>
                  <Link className={`nav-link ellipsis ${this.getActiveClass('publinkadmin')}`} to={siteRoot + 'org/publinkadmin/'} onClick={() => this.tabItemClick('publinkadmin')} >
                    <Icon symbol="links" />
                    <span className="nav-text">{gettext('Links')}</span>
                  </Link>
                </li>
                <li className={`nav-item ${this.getActiveClass('fileaudit') || this.getActiveClass('file-update') || this.getActiveClass('perm-audit')}`}>
                  <Link className={`nav-link ellipsis ${this.getActiveClass('fileaudit') || this.getActiveClass('file-update') || this.getActiveClass('perm-audit')}`} to={siteRoot + 'org/logadmin/'} onClick={() => this.tabItemClick('fileaudit')} >
                    <Icon symbol="activities" />
                    <span className="nav-text">{gettext('Logs')}</span>
                  </Link>
                </li>
                {enableMultiADFS &&
                  <li className={`nav-item ${this.getActiveClass('SAML config')}`}>
                    <Link className={`nav-link ellipsis ${this.getActiveClass('SAML config')}`} to={siteRoot + 'org/samlconfig/'} onClick={() => this.tabItemClick('SAML config')} >
                      <Icon symbol="settings" />
                      <span className="nav-text">{gettext('SAML config')}</span>
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
