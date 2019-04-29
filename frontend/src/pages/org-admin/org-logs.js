import React, { Component } from 'react';
import { Link } from '@reach/router';
import { siteRoot, gettext } from '../../utils/constants';

class OrgLogs extends Component {

  constructor(props) {
    super(props);
  }

  tabItemClick = (param) => {
    this.props.tabItemClick(param);
  }

  render() {
    return (
      <div className="main-panel-center flex-row">
        <div className="cur-view-container org-logs-container">
          <div className="cur-view-path org-user-nav">
            <ul className="nav">
              <li className="nav-item" onClick={() => this.tabItemClick('logadmin')}>
                <Link className={`nav-link ${this.props.currentTab === 'logadmin' ? 'active': ''}`} to={siteRoot + 'org/logadmin/'} title={gettext('File Access')}>{gettext('File Access')}</Link>
              </li>
              <li className="nav-item" onClick={() => this.tabItemClick('file-update')}>
                <Link className={`nav-link ${this.props.currentTab === 'file-update' ? 'active': ''}`} to={siteRoot + 'org/logadmin/file-update/'} title={gettext('File Update')}>{gettext('File Update')}</Link>
              </li>
              <li className="nav-item" onClick={() => this.tabItemClick('perm-audit')}>
                <Link className={`nav-link ${this.props.currentTab === 'perm-audit' ? 'active': ''}`} to={siteRoot + 'org/logadmin/perm-audit/'} title={gettext('Permission')}>{gettext('Permission')}</Link>
              </li>
            </ul>
          </div>
          {this.props.children}
        </div>
      </div>
    );
  }
}

export default OrgLogs;
