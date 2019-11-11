import React from 'react';
import ReactDOM from 'react-dom';
import { Router } from '@reach/router';
import { siteRoot } from '../../utils/constants';
import SidePanel from './side-panel';
import MainPanel from './main-panel';

import Info from './info';

import DesktopDevices from './devices/desktop-devices';
import MobileDevices from './devices/mobile-devices';
import DeviceErrors from './devices/devices-errors';
import AbuseReports from './abuse-reports';

import Users from './users/users';
import AdminUsers from './users/admin-users';
import LDAPImportedUsers from './users/ldap-imported-users';
import LDAPUsers from './users/ldap-users';
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
import GroupRepos from './groups/group-repos';
import GroupMembers from './groups/group-members';

import Departments from './departments/departments';
import DepartmentsList from './departments/departments-list';
import DepartmentDetail from './departments/department-detail';

import ShareLinks from './links/share-links';
import UploadLinks from './links/upload-links';

import Orgs from './orgs/orgs';
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

import AdminOperationLogs from './admin-logs/operation-logs';
import AdminLoginLogs from './admin-logs/login-logs';

import WebSettings from './web-settings/web-settings';
import Notifications from './notifications/notifications';
import FileScanRecords from './file-scan-records';
import VirusScanRecords from './virus-scan-records';
import WorkWeixinDepartments from './work-weixin-departments';

import Invitations from './invitations/invitations';

import '../../assets/css/fa-solid.css';
import '../../assets/css/fa-regular.css';
import '../../assets/css/fontawesome.css';
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
        tab: 'users',
        urlPartList: ['users/']
      },
      {
        tab: 'groups',
        urlPartList: ['groups/']
      },
      {
        tab: 'organizations',
        urlPartList: ['organizations/']
      },
    ];
    const tmpTab = this.getCurrentTabForPageList(pageList);
    currentTab = tmpTab ? tmpTab : currentTab;

    this.setState({currentTab: currentTab});
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
  }  

  render() {
    let { currentTab, isSidePanelClosed } = this.state;

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
            <Info path={siteRoot + 'sys/info'} />
            <DesktopDevices path={siteRoot + 'sys/desktop-devices'} />
            <MobileDevices path={siteRoot + 'sys/mobile-devices'} />
            <DeviceErrors path={siteRoot + 'sys/device-errors'} />
            <AllRepos path={siteRoot + 'sys/all-libraries'} />
            <SystemRepo path={siteRoot + 'sys/system-library'} />
            <TrashRepos path={siteRoot + 'sys/trash-libraries'} />
            <SearchRepos path={siteRoot + 'sys/search-libraries'} />
            <DirView path={siteRoot + 'sys/libraries/:repoID/*'} />
            <WebSettings path={siteRoot + 'sys/web-settings'} />
            <Notifications path={siteRoot + 'sys/notifications'} />
            <Groups path={siteRoot + 'sys/groups'} />
            <GroupRepos path={siteRoot + 'sys/groups/:groupID/libraries'} />
            <GroupMembers path={siteRoot + 'sys/groups/:groupID/members'} />
            <Departments path={siteRoot + 'sys/departments'}>
              <DepartmentsList path='/'/>
              <DepartmentDetail path='/:groupID'/>
            </Departments>
            <ShareLinks path={siteRoot + 'sys/share-links'} />
            <UploadLinks path={siteRoot + 'sys/upload-links'} />
            <Orgs path={siteRoot + 'sys/organizations'} />
            <OrgInfo path={siteRoot + 'sys/organizations/:orgID/info'} />
            <OrgUsers path={siteRoot + 'sys/organizations/:orgID/users'} />
            <OrgGroups path={siteRoot + 'sys/organizations/:orgID/groups'} />
            <OrgRepos path={siteRoot + 'sys/organizations/:orgID/libraries'} />
            <Institutions path={siteRoot + 'sys/institutions'} />
            <InstitutionInfo path={siteRoot + 'sys/institutions/:institutionID/info'} />
            <InstitutionUsers path={siteRoot + 'sys/institutions/:institutionID/members'} />
            <InstitutionAdmins path={siteRoot + 'sys/institutions/:institutionID/admins'} />
            <LoginLogs path={siteRoot + 'sys/logs/login'} />
            <FileAccessLogs path={siteRoot + 'sys/logs/file-access'} />
            <FileUpdateLogs path={siteRoot + 'sys/logs/file-update'} />
            <SharePermissionLogs path={siteRoot + 'sys/logs/share-permission'} />
            <AdminOperationLogs path={siteRoot + 'sys/admin-logs/operation'} />
            <AdminLoginLogs path={siteRoot + 'sys/admin-logs/login'} />
            
            <Users path={siteRoot + 'sys/users'} />
            <AdminUsers path={siteRoot + 'sys/users/admins'} />
            <LDAPImportedUsers path={siteRoot + 'sys/users/ldap-imported'} />
            <LDAPUsers path={siteRoot + 'sys/users/ldap'} />
            <User path={siteRoot + 'sys/users/:email'} />
            <UserOwnedRepos path={siteRoot + 'sys/users/:email/owned-libraries'} />
            <UserSharedRepos path={siteRoot + 'sys/users/:email/shared-libraries'} />
            <UserLinks path={siteRoot + 'sys/users/:email/shared-links'} />
            <UserGroups path={siteRoot + 'sys/users/:email/groups'} />

            <Invitations path={siteRoot + 'sys/invitations'} />

            <FileScanRecords
              path={siteRoot + 'sys/file-scan-records'}
              currentTab={currentTab} 
              tabItemClick={this.tabItemClick}
            />
            <VirusScanRecords
              path={siteRoot + 'sys/virus-scan-records'}
              currentTab={currentTab} 
              tabItemClick={this.tabItemClick}
            />
            <WorkWeixinDepartments
              path={siteRoot + 'sys/work-weixin'}
              currentTab={currentTab}
              tabItemClick={this.tabItemClick}
            />
            <AbuseReports path={siteRoot + 'sys/abuse-reports'} />
          </Router>
        </MainPanel>
      </div>
    );
  }
}

ReactDOM.render(
  <SysAdmin />,
  document.getElementById('wrapper')
);
