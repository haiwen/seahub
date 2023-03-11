import React from 'react';
import ReactDom from 'react-dom';
import { Router } from '@gatsbyjs/reach-router';
import { siteRoot } from '../../utils/constants';
import SidePanel from './side-panel';

import OrgStatisticFile from './statistic/statistic-file';
import OrgStatisticStorage from './statistic/statistic-storage';
import OrgStatisticTraffic from './statistic/statistic-traffic';
import OrgStatisticUsers from './statistic/statistic-users';
import OrgStatisticReport from './statistic/statistic-reports';
import OrgDesktopDevices from './devices/desktop-devices.js';
import OrgMobileDevices from './devices/mobile-devices.js';
import OrgDevicesErrors from './devices/devices-errors.js';
import OrgWebSettings from './web-settings/web-settings';
import OrgUsers from './org-users-users';
import OrgUsersSearchUsers from './org-users-search-users';
import OrgAdmins from './org-users-admins';
import OrgUserProfile from './org-user-profile';
import OrgUserRepos from './org-user-repos';
import OrgUserSharedRepos from './org-user-shared-repos';
import OrgGroups from './org-groups';
import OrgGroupsSearchGroups from './org-groups-search-groups';
import OrgGroupInfo from './org-group-info';
import OrgGroupRepos from './org-group-repos';
import OrgGroupMembers from './org-group-members';
import OrgLibraries from './org-libraries';
import OrgInfo from './org-info';
import OrgLinks from './org-links';
import OrgDepartments from './org-departments';
import OrgDepartmentsList from './org-departments-list';
import OrgDepartmentItem from './org-department-item';
import OrgLogs from './org-logs';
import OrgLogsFileAudit from './org-logs-file-audit';
import OrgLogsFileUpdate from './org-logs-file-update';
import OrgLogsPermAudit from './org-logs-perm-audit';
import OrgSAMLConfig from './org-saml-config';

import '../../css/layout.css';
import '../../css/toolbar.css';

class Org extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isSidePanelClosed: false,
      currentTab: 'users'
    };
  }

  componentDidMount() {
    let href = window.location.href.split('/');
    let currentTab = href[href.length - 2];

    if (location.href.indexOf(`${siteRoot}org/useradmin`) != -1) {
      currentTab = 'users';
    }
    if (location.href.indexOf(`${siteRoot}org/statistics-admin/`) != -1) {
      currentTab = 'statistics-admin';
    }
    if (location.href.indexOf(`${siteRoot}org/deviceadmin/`) != -1) {
      currentTab = 'deviceadmin';
    }
    if (location.href.indexOf(`${siteRoot}org/groupadmin`) != -1) {
      currentTab = 'groupadmin';
    }
    if (location.href.indexOf(`${siteRoot}org/departmentadmin`) != -1) {
      currentTab = 'departmentadmin';
    }
    this.setState({currentTab: currentTab});
  }

  onCloseSidePanel = () => {
    this.setState({isSidePanelClosed: !this.state.isSidePanelClosed});
  }

  tabItemClick = (param) => {
    this.setState({currentTab: param});
  }

  render() {
    let { isSidePanelClosed, currentTab } = this.state;
    return (
      <div id="main">
        <SidePanel isSidePanelClosed={isSidePanelClosed} onCloseSidePanel={this.onCloseSidePanel} currentTab={currentTab} tabItemClick={this.tabItemClick}/>
        <div className="main-panel">
          <Router className="reach-router">
            <OrgInfo path={siteRoot + 'org/info/'} />
            <OrgStatisticFile path={siteRoot + 'org/statistics-admin/file/'} />
            <OrgStatisticStorage path={siteRoot + 'org/statistics-admin/total-storage/'} />
            <OrgStatisticUsers path={siteRoot + 'org/statistics-admin/active-users/'} />
            <OrgStatisticTraffic path={siteRoot + 'org/statistics-admin/traffic/'} />
            <OrgStatisticReport path={siteRoot + 'org/statistics-admin/reports/'} />
            <OrgDesktopDevices path={siteRoot + 'org/deviceadmin/desktop-devices/'} />
            <OrgMobileDevices path={siteRoot + 'org/deviceadmin/mobile-devices/'} />
            <OrgDevicesErrors path={siteRoot + 'org/deviceadmin/devices-errors/'} />
            <OrgWebSettings path={siteRoot + 'org/web-settings'} />
            <OrgUsers path={siteRoot + 'org/useradmin'} />
            <OrgUsersSearchUsers path={siteRoot + 'org/useradmin/search-users'} />
            <OrgAdmins path={siteRoot + 'org/useradmin/admins/'} />
            <OrgUserProfile path={siteRoot + 'org/useradmin/info/:email/'} />
            <OrgUserRepos path={siteRoot + 'org/useradmin/info/:email/repos/'} />
            <OrgUserSharedRepos path={siteRoot + 'org/useradmin/info/:email/shared-repos/'} />
            <OrgGroups path={siteRoot + 'org/groupadmin'} />
            <OrgGroupsSearchGroups path={siteRoot + 'org/groupadmin/search-groups'} />
            <OrgGroupInfo path={siteRoot + 'org/groupadmin/:groupID/'} />
            <OrgGroupRepos path={siteRoot + 'org/groupadmin/:groupID/repos/'} />
            <OrgGroupMembers path={siteRoot + 'org/groupadmin/:groupID/members/'} />
            <OrgLibraries path={siteRoot + 'org/repoadmin'}/>
            <OrgLinks path={siteRoot + 'org/publinkadmin'}/>
            <OrgDepartments path={siteRoot + 'org/departmentadmin'}>
              <OrgDepartmentsList path='/'/>
              <OrgDepartmentItem path='groups/:groupID'/>
            </OrgDepartments>
            <OrgLogs path={siteRoot + 'org/logadmin'} currentTab={currentTab} tabItemClick={this.tabItemClick}>
              <OrgLogsFileAudit path='/' />
              <OrgLogsFileUpdate path='file-update' />
              <OrgLogsPermAudit path='perm-audit' />
            </OrgLogs>
            <OrgSAMLConfig path={siteRoot + 'org/samlconfig/'}/>
          </Router>
        </div>
      </div>
    );
  }
}

ReactDom.render(<Org />, document.getElementById('wrapper'));
