import React from 'react';
import { Router } from '@gatsbyjs/reach-router';
import { siteRoot, enableMultiADFS } from '../../utils/constants';
import Departments from './departments/departments';
import OrgDesktopDevices from './devices/desktop-devices';
import OrgDevicesErrors from './devices/devices-errors';
import OrgMobileDevices from './devices/mobile-devices';
import OrgAllRepos from './libraries/org-all-repos';
import OrgTrashRepos from './libraries/org-repo-trash';
import OrgGroupInfo from './org-group-info';
import OrgGroupMembers from './org-group-members';
import OrgGroupRepos from './org-group-repos';
import OrgGroups from './org-groups';
import OrgGroupsSearchGroups from './org-groups-search-groups';
import OrgInfo from './org-info';
import OrgLinks from './org-links';
import OrgLogs from './org-logs';
import OrgLogsFileAudit from './org-logs-file-audit';
import OrgLogsFileTransfer from './org-logs-file-transfer';
import OrgLogsFileUpdate from './org-logs-file-update';
import OrgLogsGroupMemberAudit from './org-logs-group-member-audit';
import OrgLogsPermAudit from './org-logs-perm-audit';
import OrgSAMLConfig from './org-saml-config';
import OrgSubscription from './org-subscription';
import OrgUserProfile from './org-user-profile';
import OrgUserRepos from './org-user-repos';
import OrgUserSharedRepos from './org-user-shared-repos';
import OrgAdmins from './org-users-admins';
import OrgUsersSearchUsers from './org-users-search-users';
import OrgUsers from './org-users-users';
import SidePanel from './side-panel';
import OrgStatisticAI from './statistic/statistic-ai';
import OrgStatisticFile from './statistic/statistic-file';
import OrgStatisticReport from './statistic/statistic-reports';
import OrgStatisticStorage from './statistic/statistic-storage';
import OrgStatisticTraffic from './statistic/statistic-traffic';
import OrgStatisticUsers from './statistic/statistic-users';
import OrgWebSettings from './web-settings/web-settings';

import '../../css/layout.css';
import '../../css/toolbar.css';
import '../../css/org-admin.css';


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
    if (location.href.indexOf(`${siteRoot}org/logadmin/`) != -1) {
      if (currentTab === 'logadmin') {
        currentTab = 'fileaudit';
      }
    }
    this.setState({
      currentTab: currentTab
    });
  }

  onCloseSidePanel = () => {
    this.setState({ isSidePanelClosed: !this.state.isSidePanelClosed });
  };

  tabItemClick = (param) => {
    this.setState({ currentTab: param });
  };

  render() {
    let { isSidePanelClosed, currentTab } = this.state;
    return (
      <div id="main" className="org-admin">
        <SidePanel isSidePanelClosed={isSidePanelClosed} onCloseSidePanel={this.onCloseSidePanel} currentTab={currentTab} tabItemClick={this.tabItemClick}/>
        <div className="main-panel">
          <Router className="reach-router">
            <OrgInfo path={siteRoot + 'org/info/'} />
            <OrgStatisticFile path={siteRoot + 'org/statistics-admin/file/'} />
            <OrgStatisticStorage path={siteRoot + 'org/statistics-admin/total-storage/'} />
            <OrgStatisticUsers path={siteRoot + 'org/statistics-admin/active-users/'} />
            <OrgStatisticTraffic path={siteRoot + 'org/statistics-admin/traffic/'} />
            <OrgStatisticAI path={siteRoot + 'org/statistics-admin/ai/'} />
            <OrgStatisticReport path={siteRoot + 'org/statistics-admin/reports/'} />
            <OrgDesktopDevices path={siteRoot + 'org/deviceadmin/desktop-devices/'} />
            <OrgMobileDevices path={siteRoot + 'org/deviceadmin/mobile-devices/'} />
            <OrgDevicesErrors path={siteRoot + 'org/deviceadmin/devices-errors/'} />
            <OrgWebSettings path={siteRoot + 'org/web-settings'} />
            <OrgSubscription path={siteRoot + 'org/subscription'} onCloseSidePanel={this.onCloseSidePanel} />
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
            <OrgAllRepos path={siteRoot + 'org/repoadmin'}/>
            <OrgTrashRepos path={siteRoot + 'org/repoadmin-trash'}/>
            <OrgLinks path={siteRoot + 'org/publinkadmin'}/>
            <Departments path={siteRoot + 'org/departmentadmin/'} />
            <OrgLogs path={siteRoot + 'org/logadmin'} currentTab={currentTab} tabItemClick={this.tabItemClick}>
              <OrgLogsFileAudit path='/' />
              <OrgLogsFileUpdate path='file-update' />
              <OrgLogsPermAudit path='perm-audit' />
              <OrgLogsFileTransfer path='repo-transfer' />
              <OrgLogsGroupMemberAudit path='group-member-audit' />
            </OrgLogs>
            {enableMultiADFS &&
              <OrgSAMLConfig path={siteRoot + 'org/samlconfig/'}/>
            }
          </Router>
        </div>
      </div>
    );
  }
}

export default Org;
