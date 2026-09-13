import React from 'react';
import MediaQuery from 'react-responsive';
import { Modal } from 'reactstrap';
import { Router } from '@gatsbyjs/reach-router';
import { siteRoot, enableMultiADFS } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import Departments from './departments/departments';
import OrgDesktopDevices from './devices/desktop-devices';
import OrgDevicesErrors from './devices/devices-errors';
import OrgMobileDevices from './devices/mobile-devices';
import OrgAllRepos from './libraries/org-all-repos';
import OrgTrashRepos from './libraries/org-repo-trash';
import OrgGroupInfo from './org-groups/org-group-info';
import OrgGroupMembers from './org-groups/org-group-members';
import OrgGroupRepos from './org-groups/org-group-repos';
import OrgGroups from './org-groups/org-groups';
import OrgGroupsSearchGroups from './org-groups/org-groups-search-groups';
import OrgInfo from './org-info';
import OrgLinks from './org-links';
import OrgLogs from './org-logs/org-logs';
import OrgLogsFileAudit from './org-logs/org-logs-file-audit';
import OrgLogsFileTransfer from './org-logs/org-logs-file-transfer';
import OrgLogsFileUpdate from './org-logs/org-logs-file-update';
import OrgLogsGroupMemberAudit from './org-logs/org-logs-group-member-audit';
import OrgLogsPermAudit from './org-logs/org-logs-perm-audit';
import OrgSAMLConfig from './org-saml-config';
import OrgSubscription from './org-subscription';
import OrgUserProfile from './org-users/org-user-profile';
import OrgUserRepos from './org-users/org-user-repos';
import OrgUserSharedRepos from './org-users/org-user-shared-repos';
import OrgAdmins from './org-users/org-users-admins';
import OrgUsersSearchUsers from './org-users/org-users-search-users';
import OrgUsers from './org-users/org-users-users';
import OrgWebSettings from './settings';
import SidePanel from './side-panel';
import OrgStatisticAI from './statistic/statistic-ai';
import OrgStatisticFile from './statistic/statistic-file';
import OrgStatisticReport from './statistic/statistic-reports';
import OrgStatisticStorage from './statistic/statistic-storage';
import OrgStatisticTraffic from './statistic/statistic-traffic';
import OrgStatisticUsers from './statistic/statistic-users';

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
    if (!Utils.isDesktop() && !this.state.isSidePanelClosed) {
      this.setState({ isSidePanelClosed: true });
    }
  };

  render() {
    let { isSidePanelClosed, currentTab } = this.state;

    const commonProps = {
      toggleSidePanel: this.onCloseSidePanel
    };

    return (
      <div id="main" className="org-admin">
        <SidePanel isSidePanelClosed={isSidePanelClosed} onCloseSidePanel={this.onCloseSidePanel} currentTab={currentTab} tabItemClick={this.tabItemClick}/>
        <div className="main-panel">
          <Router className="reach-router">
            <OrgInfo path={siteRoot + 'org/info/'} {...commonProps} />
            <OrgStatisticFile path={siteRoot + 'org/statistics-admin/file/'} {...commonProps} />
            <OrgStatisticStorage path={siteRoot + 'org/statistics-admin/total-storage/'} {...commonProps} />
            <OrgStatisticUsers path={siteRoot + 'org/statistics-admin/active-users/'} {...commonProps} />
            <OrgStatisticTraffic path={siteRoot + 'org/statistics-admin/traffic/'} {...commonProps} />
            <OrgStatisticAI path={siteRoot + 'org/statistics-admin/ai/'} {...commonProps} />
            <OrgStatisticReport path={siteRoot + 'org/statistics-admin/reports/'} {...commonProps} />
            <OrgDesktopDevices path={siteRoot + 'org/deviceadmin/desktop-devices/'} {...commonProps} />
            <OrgMobileDevices path={siteRoot + 'org/deviceadmin/mobile-devices/'} {...commonProps} />
            <OrgDevicesErrors path={siteRoot + 'org/deviceadmin/devices-errors/'} {...commonProps} />
            <OrgWebSettings path={siteRoot + 'org/web-settings'} {...commonProps} />
            <OrgSubscription path={siteRoot + 'org/subscription'} {...commonProps} />
            <OrgUsers path={siteRoot + 'org/useradmin'} {...commonProps} />
            <OrgUsersSearchUsers path={siteRoot + 'org/useradmin/search-users'} {...commonProps} />
            <OrgAdmins path={siteRoot + 'org/useradmin/admins/'} {...commonProps} />
            <OrgUserProfile path={siteRoot + 'org/useradmin/info/:email/'} {...commonProps} />
            <OrgUserRepos path={siteRoot + 'org/useradmin/info/:email/repos/'} {...commonProps} />
            <OrgUserSharedRepos path={siteRoot + 'org/useradmin/info/:email/shared-repos/'} {...commonProps} />
            <OrgGroups path={siteRoot + 'org/groupadmin'} {...commonProps} />
            <OrgGroupsSearchGroups path={siteRoot + 'org/groupadmin/search-groups'} {...commonProps} />
            <OrgGroupInfo path={siteRoot + 'org/groupadmin/:groupID/'} {...commonProps} />
            <OrgGroupRepos path={siteRoot + 'org/groupadmin/:groupID/repos/'} {...commonProps} />
            <OrgGroupMembers path={siteRoot + 'org/groupadmin/:groupID/members/'} {...commonProps} />
            <OrgAllRepos path={siteRoot + 'org/repoadmin'} {...commonProps} />
            <OrgTrashRepos path={siteRoot + 'org/repoadmin-trash'} {...commonProps} />
            <OrgLinks path={siteRoot + 'org/publinkadmin'} {...commonProps} />
            <Departments path={siteRoot + 'org/departmentadmin/'} {...commonProps} />
            <OrgLogs path={siteRoot + 'org/logadmin'} currentTab={currentTab} tabItemClick={this.tabItemClick} {...commonProps}>
              <OrgLogsFileAudit path='/' />
              <OrgLogsFileUpdate path='file-update' />
              <OrgLogsPermAudit path='perm-audit' />
              <OrgLogsFileTransfer path='repo-transfer' />
              <OrgLogsGroupMemberAudit path='group-member-audit' />
            </OrgLogs>
            {enableMultiADFS &&
              <OrgSAMLConfig path={siteRoot + 'org/samlconfig/'} {...commonProps} />
            }
          </Router>
        </div>
        <MediaQuery query="(max-width: 767.8px)">
          <Modal zIndex="1030" isOpen={!isSidePanelClosed} toggle={this.onCloseSidePanel} contentClassName="d-none"></Modal>
        </MediaQuery>
      </div>
    );
  }
}

export default Org;
