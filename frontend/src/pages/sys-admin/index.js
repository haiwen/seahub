import React from 'react';
import ReactDom from 'react-dom';
import MediaQuery from 'react-responsive';
import { Modal } from 'reactstrap';
import { Router } from '@gatsbyjs/reach-router';
import { siteRoot } from '../../utils/constants';
import { Utils } from '../../utils/utils';

import SidePanel from './side-panel';
import MainPanel from './main-panel';

import Info from './info';

import StatisticFile from './statistic/statistic-file';
import StatisticStorage from './statistic/statistic-storage';
import StatisticTraffic from './statistic/statistic-traffic';
import StatisticUsers from './statistic/statistic-users';
import StatisticReport from './statistic/statistic-reports';

import DesktopDevices from './devices/desktop-devices';
import MobileDevices from './devices/mobile-devices';
import DeviceErrors from './devices/devices-errors';

import Users from './users/users';
import AdminUsers from './users/admin-users';
import LDAPImportedUsers from './users/ldap-imported-users';
import LDAPUsers from './users/ldap-users';
import SearchUsers from './users/search-users';
import User from './users/user-info';
import UserOwnedRepos from './users/user-repos';
import UserSharedRepos from './users/user-shared-repos';
import UserLinks from './users/user-links';
import UserGroups from './users/user-groups';

import AllRepos from './repos/all-repos';
import SystemRepo from './repos/system-repo';
import TrashRepos from './repos/trash-repos';
import SearchRepos from './repos/search-repos';
import DirView from './repos/dir-view';

import Groups from './groups/groups';
import SearchGroups from './groups/search-groups';
import GroupRepos from './groups/group-repos';
import GroupMembers from './groups/group-members';

import Departments from './departments/departments';
import DepartmentList from './departments/department-list';
import SubDepartments from './departments/sub-departments';
import DepartmentMembers from './departments/department-members';
import DepartmentLibraries from './departments/department-libraries';

import ShareLinks from './links/share-links';
import UploadLinks from './links/upload-links';

import Orgs from './orgs/orgs';
import SearchOrgs from './orgs/search-orgs';
import OrgInfo from './orgs/org-info';
import OrgUsers from './orgs/org-users';
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
        urlPartList: ['statistics/file', 'statistics/storage', 'statistics/user', 'statistics/traffic', 'statistics/reports']
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
        urlPartList: ['organizations/', 'search-organizations/']
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

    this.setState({currentTab: currentTab});
  }

  componentWillMount() {
    if (!Utils.isDesktop()) {
      this.setState({
        isSidePanelClosed: true
      });
    }
  }

  getCurrentTabForPageList = (pageList) => {
    let urlPartList, tab;
    const urlBase = `${siteRoot}sys/`;
    for (let i = 0, len = pageList.length; i < len; i++) {
      urlPartList = pageList[i].urlPartList;
      tab = pageList[i].tab;
      for (let j = 0, jlen = urlPartList.length; j < jlen; j++) {
        if (location.href.indexOf(`${urlBase}${urlPartList[j]}`) != -1) {
          return tab;
        }
      }
    }
  }

  onCloseSidePanel = () => {
    this.setState({isSidePanelClosed: !this.state.isSidePanelClosed});
  }

  tabItemClick = (param) => {
    this.setState({currentTab: param});
    if (!Utils.isDesktop() && !this.state.isSidePanelClosed) {
      this.setState({ isSidePanelClosed: true });
    }
  }

  toggleSidePanel = () => {
    this.setState({
      isSidePanelClosed: !this.state.isSidePanelClosed
    });
  }

  render() {
    const { currentTab, isSidePanelClosed } = this.state;
    const commonProps = {
      toggleSidePanel: this.toggleSidePanel
    };

    return (
      <div id="main">
        <SidePanel
          isSidePanelClosed={isSidePanelClosed}
          onCloseSidePanel={this.onCloseSidePanel}
          currentTab={currentTab}
          tabItemClick={this.tabItemClick}
        />
        <MainPanel>
          <Router className="reach-router">
            <Info path={siteRoot + 'sys/info'} {...commonProps} />
            <StatisticFile path={siteRoot + 'sys/statistics/file'} {...commonProps} />
            <StatisticStorage path={siteRoot + 'sys/statistics/storage'} {...commonProps} />
            <StatisticUsers path={siteRoot + 'sys/statistics/user'} {...commonProps} />
            <StatisticTraffic path={siteRoot + 'sys/statistics/traffic'} {...commonProps} />
            <StatisticReport path={siteRoot + 'sys/statistics/reports'} {...commonProps} />
            <DesktopDevices path={siteRoot + 'sys/desktop-devices'} {...commonProps} />
            <MobileDevices path={siteRoot + 'sys/mobile-devices'} {...commonProps} />
            <DeviceErrors path={siteRoot + 'sys/device-errors'} {...commonProps} />
            <AllRepos path={siteRoot + 'sys/all-libraries'} {...commonProps} />
            <SystemRepo path={siteRoot + 'sys/system-library'} {...commonProps} />
            <TrashRepos path={siteRoot + 'sys/trash-libraries'} {...commonProps} />
            <SearchRepos path={siteRoot + 'sys/search-libraries'} {...commonProps} />
            <DirView path={siteRoot + 'sys/libraries/:repoID/*'} {...commonProps} />
            <WebSettings path={siteRoot + 'sys/web-settings'} {...commonProps} />
            <Notifications path={siteRoot + 'sys/notifications'} {...commonProps} />
            <Groups path={siteRoot + 'sys/groups'} {...commonProps} />
            <SearchGroups path={siteRoot + 'sys/search-groups'} {...commonProps} />
            <GroupRepos path={siteRoot + 'sys/groups/:groupID/libraries'} {...commonProps} />
            <GroupMembers path={siteRoot + 'sys/groups/:groupID/members'} {...commonProps} />
            <Departments path={siteRoot + 'sys/departments'}>
              <DepartmentList path='/' {...commonProps} />
              <SubDepartments path='/:groupID' {...commonProps} />
              <DepartmentMembers path='/:groupID/members' {...commonProps} />
              <DepartmentLibraries path='/:groupID/libraries' {...commonProps} />
            </Departments>
            <ShareLinks path={siteRoot + 'sys/share-links'} {...commonProps} />
            <UploadLinks path={siteRoot + 'sys/upload-links'} {...commonProps} />
            <Orgs path={siteRoot + 'sys/organizations'} {...commonProps} />
            <SearchOrgs path={siteRoot + 'sys/search-organizations'} {...commonProps} />
            <OrgInfo path={siteRoot + 'sys/organizations/:orgID/info'} {...commonProps} />
            <OrgUsers path={siteRoot + 'sys/organizations/:orgID/users'} {...commonProps} />
            <OrgGroups path={siteRoot + 'sys/organizations/:orgID/groups'} {...commonProps} />
            <OrgRepos path={siteRoot + 'sys/organizations/:orgID/libraries'} {...commonProps} />
            <Institutions path={siteRoot + 'sys/institutions'} {...commonProps} />
            <InstitutionInfo path={siteRoot + 'sys/institutions/:institutionID/info'} {...commonProps} />
            <InstitutionUsers path={siteRoot + 'sys/institutions/:institutionID/members'} {...commonProps} />
            <InstitutionAdmins path={siteRoot + 'sys/institutions/:institutionID/admins'} {...commonProps} />
            <LoginLogs path={siteRoot + 'sys/logs/login'} {...commonProps} />
            <FileAccessLogs path={siteRoot + 'sys/logs/file-access'} {...commonProps} />
            <FileUpdateLogs path={siteRoot + 'sys/logs/file-update'} {...commonProps} />
            <SharePermissionLogs path={siteRoot + 'sys/logs/share-permission'} {...commonProps} />
            <AdminOperationLogs path={siteRoot + 'sys/admin-logs/operation'} {...commonProps} />
            <AdminLoginLogs path={siteRoot + 'sys/admin-logs/login'} {...commonProps} />

            <Users path={siteRoot + 'sys/users'} {...commonProps} />
            <AdminUsers path={siteRoot + 'sys/users/admins'} {...commonProps} />
            <LDAPImportedUsers path={siteRoot + 'sys/users/ldap-imported'} {...commonProps} />
            <LDAPUsers path={siteRoot + 'sys/users/ldap'} {...commonProps} />
            <SearchUsers path={siteRoot + 'sys/search-users'} {...commonProps} />
            <User path={siteRoot + 'sys/users/:email'} {...commonProps} />
            <UserOwnedRepos path={siteRoot + 'sys/users/:email/owned-libraries'} {...commonProps} />
            <UserSharedRepos path={siteRoot + 'sys/users/:email/shared-libraries'} {...commonProps} />
            <UserLinks path={siteRoot + 'sys/users/:email/shared-links'} {...commonProps} />
            <UserGroups path={siteRoot + 'sys/users/:email/groups'} {...commonProps} />

            <Invitations path={siteRoot + 'sys/invitations'} {...commonProps} />
            <TermsAndConditions path={siteRoot + 'sys/terms-and-conditions/'} {...commonProps} />

            <AllVirusFiles path={siteRoot + 'sys/virus-files/all'} {...commonProps} />
            <UnhandledVirusFiles path={siteRoot + 'sys/virus-files/unhandled'} {...commonProps} />

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

ReactDom.render(<SysAdmin />, document.getElementById('wrapper'));
