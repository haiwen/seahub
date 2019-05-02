import React, { Component, Fragment } from 'react';
import { Link } from '@reach/router';
import { siteRoot, gettext } from '../../utils/constants';
import MainPanelTopbar from './main-panel-topbar';

class OrgUsers extends Component {

  constructor(props) {
    super(props);
  }

  tabItemClick = (param) => {
    this.props.tabItemClick(param);
  }

  render() {
    return (
      <Fragment>
        <MainPanelTopbar
          currentTab={this.props.currentTab}
          toggleAddOrgUser={this.props.toggleAddOrgUser}
          toggleInviteUserDialog={this.props.toggleInviteUserDialog}
          toggleAddOrgAdmin={this.props.toggleAddOrgAdmin}
        />
        <div className="main-panel-center flex-row">
          <div className="cur-view-container">
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
      </Fragment>
    );
  }
}

export default OrgUsers;
