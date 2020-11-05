import React from 'react';
import PropTypes from 'prop-types';
import { Link } from '@reach/router';
import Logo from '../../components/logo';
import { gettext, siteRoot } from '../../utils/constants';

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

  tabItemClick = (tab) => {
    this.props.tabItemClick(tab);
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
              <h3 className="sf-heading" style={{ 'color': '#f7941d' }}>{gettext('Admin')}</h3>
              <ul className="nav nav-pills flex-column nav-container">
                <li className="nav-item">
                  <Link className={`nav-link ellipsis ${this.getActiveClass('orgmanage')}`} to={siteRoot + 'org/orgmanage/'} onClick={() => this.tabItemClick('orgmanage')} >
                    <span className="sf2-icon-info"></span>
                    <span className="nav-text">{gettext('Info')}</span>
                  </Link>
                </li>
                <li className="nav-item">
                  <Link className={`nav-link ellipsis ${this.getActiveClass('repoadmin')}`} to={siteRoot + 'org/repoadmin/'} onClick={() => this.tabItemClick('repoadmin')} >
                    <span className="sf2-icon-library"></span>
                    <span className="nav-text">{gettext('Libraries')}</span>
                  </Link>
                </li>
                <li className="nav-item">
                  <Link className={`nav-link ellipsis ${this.getActiveClass('users') || this.getActiveClass('admins')}`} to={siteRoot + 'org/useradmin/'} onClick={() => this.tabItemClick('users')} >
                    <span className="sf2-icon-user"></span>
                    <span className="nav-text">{gettext('Users')}</span>
                  </Link>
                </li>
                <li className="nav-item">
                  <Link className={`nav-link ellipsis ${this.getActiveClass('groupadmin')}`} to={siteRoot + 'org/groupadmin/'} onClick={() => this.tabItemClick('groupadmin')}>
                    <span className="sf2-icon-group"></span>
                    <span className="nav-text">{gettext('Groups')}</span>
                  </Link>
                </li>
                <li className="nav-item">
                  <Link className={`nav-link ellipsis ${this.getActiveClass('departmentadmin')}`} to={siteRoot + 'org/departmentadmin/'} onClick={() => this.tabItemClick('departmentadmin')} >
                    <span className="sf2-icon-organization"></span>
                    <span className="nav-text">{gettext('Departments')}</span>
                  </Link>
                </li>
                <li className="nav-item">
                  <Link className={`nav-link ellipsis ${this.getActiveClass('publinkadmin')}`} to={siteRoot + 'org/publinkadmin/'} onClick={() => this.tabItemClick('publinkadmin')} >
                    <span className="sf2-icon-link"></span>
                    <span className="nav-text">{gettext('Links')}</span>
                  </Link>
                </li>
                <li className="nav-item">
                  <Link className={`nav-link ellipsis ${this.getActiveClass('logadmin') || this.getActiveClass('file-update') || this.getActiveClass('perm-audit')}`} to={siteRoot + 'org/logadmin/'} onClick={() => this.tabItemClick('logadmin')} >
                    <span className="sf2-icon-clock"></span>
                    <span className="nav-text">{gettext('Logs')}</span>
                  </Link>
                </li>
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
