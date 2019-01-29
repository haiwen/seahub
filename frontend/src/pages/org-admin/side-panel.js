import React from 'react';
import PropTypes from 'prop-types';
import { Link } from '@reach/router';
import Logo from '../../components/logo';
import { gettext, siteRoot } from '../../utils/constants';

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
              <h3 className="sf-heading" style={{ 'color': '#f7941d' }}>{gettext('Admin')}</h3>
              <ul className="nav nav-pills flex-column nav-container">
                <li className="nav-item">
                  <a className='nav-link ellipsis' href={siteRoot + "org/orgmanage/"}>
                    <span className="sf2-icon-monitor" aria-hidden="true"></span>
                    <span className="nav-text">{gettext('Info')}</span>
                  </a>
                </li>
                <li className="nav-item">
                  <a className='nav-link ellipsis' href={siteRoot + "org/repoadmin/"}>
                    <span className="sf2-icon-library"></span>
                    <span className="nav-text">{gettext('Libraries')}</span>
                  </a>
                </li>
                <li className="nav-item">
                  <Link className='nav-link ellipsis active' to={siteRoot + "org/useradmin/"}>
                    <span className="sf2-icon-user"></span>
                    <span className="nav-text">{gettext('Users')}</span>
                  </Link>
                </li>
                <li className="nav-item">
                  <a href="/org/admin/#address-book/" className="nav-link ellipsis">
                    <span className="sf2-icon-organization"></span>
                    <span className="nav-text">{gettext('Departments')}</span>
                  </a>
                </li>
                <li className="nav-item">
                  <a href="/org/groupadmin/" className="nav-link ellipsis">
                    <span className="sf2-icon-group"></span>
                    <span className="nav-text">{gettext('Groups')}</span>
                  </a>
                </li>
                <li className="nav-item">
                  <a href="/org/publinkadmin/" className="nav-link ellipsis">
                    <span className="sf2-icon-link"></span>
                    <span className="nav-text">{gettext('Links')}</span>
                  </a>
                </li>
                <li className="nav-item">
                  <a href="/org/file-audit-admin/" className="nav-link ellipsis">
                    <span className="sf2-icon-clock"></span>
                    <span className="nav-text">{gettext('Logs')}</span>
                  </a>
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
