import React, { Component } from 'react';
import { Link } from '@reach/router';
import { siteRoot, gettext } from '../../utils/constants';

class OrgUsers extends Component {

  constructor(props) {
    super(props);
  }

  tabItemClick = (param) => {
    this.props.tabItemClick(param);
  }

  render() {
    return (
      <div className="main-panel-center flex-row">
        <div className="cur-view-container org-users-container">
          <div className="cur-view-path org-user-nav">
            <ul className="nav">
              <li className="nav-item" onClick={() => this.tabItemClick('users')}>
                <Link className={`nav-link ${this.props.currentTab === 'users' ? 'active': ''}`} to={siteRoot + 'org/useradmin/'} title={gettext('All')}>{gettext('All')}</Link>
              </li>
              <li className="nav-item" onClick={() => this.tabItemClick('admins')}>
                <Link className={`nav-link ${this.props.currentTab === 'admins' ? 'active': ''}`} to={siteRoot + 'org/useradmin/admins/'} title={gettext('Admin')}>{gettext('Admin')}</Link>
              </li>
            </ul>
          </div>
          {this.props.children}
        </div>
      </div>
    );
  }
}

export default OrgUsers;
