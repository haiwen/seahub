import React from 'react';
import { createRoot } from 'react-dom/client';
import MediaQuery from 'react-responsive';
import { Modal } from 'reactstrap';
import { globalHistory, LocationProvider, Router } from '@gatsbyjs/reach-router';
import { I18nextProvider } from 'react-i18next';
import { siteRoot } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import i18n from '../../_i18n/i18n-seafile-editor';

import SidePanel from './side-panel';
import MainPanel from './main-panel';

import Info from './info';
import StatisticLayout from './statistic/layout';

import SearchUsers from './users/search-users';
import User from './users/user-info';
import UserOwnedRepos from './users/user-repos';
import UserSharedRepos from './users/user-shared-repos';
import UserLinks from './users/user-links';
import UserGroups from './users/user-groups';
import { UsersLayout, UserLayout } from './users';

import SearchRepos from './repos/search-repos';
import DirView from './repos/dir-view';

import Groups from './groups/groups';
import SearchGroups from './groups/search-groups';
import GroupRepos from './groups/group-repos';
import GroupMembers from './groups/group-members';

import Departments from './departments/departments';

import Orgs from './orgs/orgs';
import OrgsTrafficExceeded from './orgs/orgs-traffic-exceeded';
import SearchOrgs from './orgs/search-orgs';
import OrgInfo from './orgs/org-info';
import OrgUsers from './orgs/org-users';
import OrgAdmins from './orgs/org-admins';
import OrgGroups from './orgs/org-groups';
import OrgRepos from './orgs/org-repos';

import Institutions from './institutions/institutions';
import InstitutionInfo from './institutions/institution-info';
import InstitutionUsers from './institutions/institution-users';
import InstitutionAdmins from './institutions/institution-admins';

import LoginLogs from './logs-page/login-logs';
import FileAccessLogs from './logs-page/file-access-logs';
import FileUpdateLogs from './logs-page/file-update-logs';
import SharePermissionLogs from './logs-page/share-permission-logs';
import FIleTransferLogs from './logs-page/file-transfer-log';
import GroupMemberAuditLogs from './logs-page/group-member-audit-logs';
import WebSettings from './web-settings/web-settings';
import Notifications from './notifications/notifications';
import FileScanRecords from './file-scan-records';
import WorkWeixinDepartments from './work-weixin-departments';
import DingtalkDepartments from './dingtalk-departments';
import Invitations from './invitations/invitations';
import TermsAndConditions from './terms-and-conditions/terms-and-conditions';

import AllVirusFiles from './virus-scan/all-virus-files';
import UnhandledVirusFiles from './virus-scan/unhandled-virus-files';

import AdminOperationLogs from './admin-logs/operation-logs';
import AdminLoginLogs from './admin-logs/login-logs';

import AbuseReports from './abuse-reports';
import Devices from './devices';
import DesktopDevices from './devices/desktop-devices';
import MobileDevices from './devices/mobile-devices';
import DeviceErrors from './devices/devices-errors';
import LibrariesAndLinks from './libraries-and-links';
import Logs from './logs-page';
import VirusScan from './virus-scan';
import AdminLogs from './admin-logs';

import '../../css/layout.css';
import '../../css/toolbar.css';

class SysAdmin extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isSidePanelClosed: false,
      currentTab: 'file-scan'
    };
  }

  componentDidMount() {
    let href = window.location.href.split('/');
    let currentTab = href[href.length - 2];

    const pageList = [
      {
        tab: 'devices',
        urlPartList: ['desktop-devices', 'mobile-devices', 'device-errors']
      },
      {
        tab: 'libraries',
        urlPartList: ['all-libraries', 'search-libraries', 'system-library', 'trash-libraries', 'libraries/']
      },
      {
        tab: 'statistic',
        urlPartList: ['statistics/file', 'statistics/storage', 'statistics/user', 'statistics/traffic', 'statistics/reports', 'statistics/metrics']
      },
      {
        tab: 'users',
        urlPartList: ['users/', 'search-users/']
      },
      {
        tab: 'groups',
        urlPartList: ['groups/', 'search-groups/']
      },
      {
        tab: 'organizations',
        urlPartList: ['organizations/', 'search-organizations/', 'organizations/traffic-exceeded']
      },
      {
        tab: 'links',
        urlPartList: ['share-links/', 'upload-links/']
      },
      {
        tab: 'institutions',
        urlPartList: ['institutions/']
      },
      {
        tab: 'termsandconditions',
        urlPartList: ['terms-and-conditions/']
      },
      {
        tab: 'departments',
        urlPartList: ['departments/']
      },
      {
        tab: 'logs',
        urlPartList: ['logs/']
      },
      {
        tab: 'virus-files',
        urlPartList: ['virus-files/']
      },
      {
        tab: 'adminLogs',
        urlPartList: ['admin-logs/']
      }
    ];
    const tmpTab = this.getCurrentTabForPageList(pageList);
    currentTab = tmpTab ? tmpTab : currentTab;

    this.setState({ currentTab: currentTab });
  }

  UNSAFE_componentWillMount() {
    if (!Utils.isDesktop()) {
      this.setState({
        isSidePanelClosed: true
      });
    }
  }

  getCurrentTabForPageList = (pageList) => {
    let urlPartList; let tab;
    const urlBase = `${siteRoot}sys/`;
    for (let i = 0, len = pageList.length; i < len; i++) {
      urlPartList = pageList[i].urlPartList;
      tab = pageList[i].tab;
      for (let j = 0, len = urlPartList.length; j < len; j++) {
        if (location.href.indexOf(`${urlBase}${urlPartList[j]}`) != -1) {
          return tab;
        }
      }
    }
  };

  onCloseSidePanel = () => {
    this.setState({ isSidePanelClosed: !this.state.isSidePanelClosed });
  };

  tabItemClick = (param) => {
    this.setState({ currentTab: param });
    if (!Utils.isDesktop() && !this.state.isSidePanelClosed) {
      this.setState({ isSidePanelClosed: true });
    }
  };

  toggleSidePanel = () => {
    this.setState({
      isSidePanelClosed: !this.state.isSidePanelClosed
    });
  };

  render() {
    const { currentTab, isSidePanelClosed } = this.state;
    const commonProps = {
      toggleSidePanel: this.toggleSidePanel
    };

    return (
      <div id="main" className="sys-admin">
        <SidePanel
          isSidePanelClosed={isSidePanelClosed}
          onCloseSidePanel={this.onCloseSidePanel}
          currentTab={currentTab}
          tabItemClick={this.tabItemClick}
        />
        <MainPanel>
          <Router className="reach-router">
            <Info path={siteRoot + 'sys/info'} {...commonProps} />
            <StatisticLayout path={`${siteRoot}sys/statistics/*`} {...commonProps} />
            <LibrariesAndLinks path={`${siteRoot}sys/*`} {...commonProps} />
            <DirView path={`${siteRoot}sys/libraries/:repoID`} {...commonProps} />
            <Devices path={`${siteRoot}sys/devices/`} {...commonProps}>
              <DesktopDevices path="desktop" />
              <MobileDevices path="mobile" />
              <DeviceErrors path="errors" />
            </Devices>
            <SearchRepos path={siteRoot + 'sys/search-libraries'} {...commonProps} />
            <WebSettings path={siteRoot + 'sys/web-settings'} {...commonProps} />
            <Notifications path={siteRoot + 'sys/notifications'} {...commonProps} />
            <Groups path={siteRoot + 'sys/groups'} {...commonProps} />
            <SearchGroups path={siteRoot + 'sys/search-groups'} {...commonProps} />
            <GroupRepos path={siteRoot + 'sys/groups/:groupID/libraries'} {...commonProps} />
            <GroupMembers path={siteRoot + 'sys/groups/:groupID/members'} {...commonProps} />
            <Departments path={siteRoot + 'sys/departments/'} {...commonProps} />
            <Orgs path={siteRoot + 'sys/organizations'} {...commonProps} />
            <OrgsTrafficExceeded path={siteRoot + 'sys/organizations/traffic-exceeded'} {...commonProps} />
            <SearchOrgs path={siteRoot + 'sys/search-organizations'} {...commonProps} />
            <OrgInfo path={siteRoot + 'sys/organizations/:orgID/info'} {...commonProps} />
            <OrgUsers path={siteRoot + 'sys/organizations/:orgID/users'} {...commonProps} />
            <OrgAdmins path={siteRoot + 'sys/organizations/:orgID/admin-users'} {...commonProps} />
            <OrgGroups path={siteRoot + 'sys/organizations/:orgID/groups'} {...commonProps} />
            <OrgRepos path={siteRoot + 'sys/organizations/:orgID/libraries'} {...commonProps} />
            <Institutions path={siteRoot + 'sys/institutions'} {...commonProps} />
            <InstitutionInfo path={siteRoot + 'sys/institutions/:institutionID/info'} {...commonProps} />
            <InstitutionUsers path={siteRoot + 'sys/institutions/:institutionID/members'} {...commonProps} />
            <InstitutionAdmins path={siteRoot + 'sys/institutions/:institutionID/admins'} {...commonProps} />
            <Logs path={`${siteRoot}sys/logs/`} {...commonProps}>
              <LoginLogs path="login" {...commonProps} />
              <FileAccessLogs path="file-access" {...commonProps} />
              <FIleTransferLogs path="repo-transfer" {...commonProps} />
              <GroupMemberAuditLogs path="group-member-audit" {...commonProps} />
              <FileUpdateLogs path="file-update" {...commonProps} />
              <SharePermissionLogs path="share-permission" {...commonProps} />
            </Logs>
            <AdminLogs path={`${siteRoot}sys/admin-logs/`} {...commonProps}>
              <AdminOperationLogs path="operation" />
              <AdminLoginLogs path="login" />
            </AdminLogs>
            <UsersLayout path={`${siteRoot}sys/users/*`} {...commonProps} />
            <UsersLayout path={`${siteRoot}sys/users/admins`} {...commonProps} />
            <SearchUsers path={siteRoot + 'sys/search-users'} {...commonProps} />
            <UserLayout path={`${siteRoot}sys/users/:email/`} {...commonProps} >
              <User path="/" />
              <UserOwnedRepos path="owned-libraries" />
              <UserSharedRepos path="shared-libraries" />
              <UserLinks path="shared-links" />
              <UserGroups path="groups" />
            </UserLayout>
            <Invitations path={siteRoot + 'sys/invitations'} {...commonProps} />
            <TermsAndConditions path={siteRoot + 'sys/terms-and-conditions/'} {...commonProps} />
            <VirusScan path={`${siteRoot}sys/virus-files/`} {...commonProps}>
              <AllVirusFiles path="all" />
              <UnhandledVirusFiles path="unhandled" />
            </VirusScan>
            <FileScanRecords path={siteRoot + 'sys/file-scan-records'} {...commonProps} />
            <WorkWeixinDepartments path={siteRoot + 'sys/work-weixin'} {...commonProps} />
            <DingtalkDepartments path={siteRoot + 'sys/dingtalk'} {...commonProps} />
            <AbuseReports path={siteRoot + 'sys/abuse-reports'} {...commonProps} />
          </Router>
        </MainPanel>
        <MediaQuery query="(max-width: 767.8px)">
          <Modal zIndex="1030" isOpen={!isSidePanelClosed} toggle={this.toggleSidePanel} contentClassName="d-none"></Modal>
        </MediaQuery>
      </div>
    );
  }
}

const root = createRoot(document.getElementById('wrapper'));
root.render(
  <I18nextProvider value={i18n}>
    <LocationProvider history={globalHistory}>
      <SysAdmin />
    </LocationProvider>
  </I18nextProvider>
);
