// Import React!
import React from 'react';
import ReactDOM from 'react-dom';
import { Router } from '@reach/router';
import { siteRoot } from '../../utils/constants';
import SidePanel from './side-panel';
import MainPanel from './main-panel';
import OrgUsers from './org-users';
import OrgUsersList from './org-users-list';
import OrgAdminList from './org-admin-list';
import OrgGroups from './org-groups';
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

import '../../assets/css/fa-solid.css';
import '../../assets/css/fa-regular.css';
import '../../assets/css/fontawesome.css';
import '../../css/layout.css';
import '../../css/toolbar.css';

class Org extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isSidePanelClosed: false,
      isShowAddOrgUserDialog: false,
      isShowAddOrgAdminDialog: false,
      isInviteUserDialogOpen: false,
      currentTab: 'users',
    };
  }

  componentDidMount() {
    let href = window.location.href.split('/');
    let currentTab = href[href.length - 2];
    if (currentTab == 'useradmin') {
      currentTab = 'users';
    }
    if (currentTab > 0) {
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

  toggleAddOrgUser = () => {
    this.setState({isShowAddOrgUserDialog: !this.state.isShowAddOrgUserDialog});
  } 

  toggleAddOrgAdmin = () => {
    this.setState({isShowAddOrgAdminDialog: !this.state.isShowAddOrgAdminDialog});
  } 

  toggleInviteUserDialog = () => {
    this.setState({isInviteUserDialogOpen: !this.state.isInviteUserDialogOpen});
  }

  render() {

    let { isSidePanelClosed, currentTab, isShowAddOrgUserDialog, isShowAddOrgAdminDialog, isInviteUserDialogOpen } = this.state;
    let href = window.location.href;
    let newPath = 'groups/';
    if (href.indexOf('org/departmentadmin/groups/') > 0) {
      newPath = href.slice(href.indexOf('groups/'));
    }
    return (
      <div id="main">
        <SidePanel isSidePanelClosed={isSidePanelClosed} onCloseSidePanel={this.onCloseSidePanel} currentTab={currentTab} tabItemClick={this.tabItemClick} />
        <MainPanel currentTab={currentTab} toggleAddOrgAdmin={this.toggleAddOrgAdmin} toggleAddOrgUser={this.toggleAddOrgUser} toggleInviteUserDialog={this.toggleInviteUserDialog}>
          <Router>
            <OrgInfo path={siteRoot + 'org/orgmanage'} />
            <OrgUsers 
              path={siteRoot + 'org/useradmin'}
              currentTab={currentTab} 
              tabItemClick={this.tabItemClick}
              toggleAddOrgAdmin={this.toggleAddOrgAdmin} 
              toggleAddOrgUser={this.toggleAddOrgUser} 
            >
              <OrgUsersList path="/" currentTab={currentTab} isShowAddOrgUserDialog={isShowAddOrgUserDialog} isInviteUserDialogOpen={isInviteUserDialogOpen} toggleAddOrgUser={this.toggleAddOrgUser} toggleInviteUserDialog={this.toggleInviteUserDialog} />
              <OrgAdminList path="admins" currentTab={currentTab} isShowAddOrgAdminDialog={isShowAddOrgAdminDialog} toggleAddOrgAdmin={this.toggleAddOrgAdmin} />
            </OrgUsers>
            <OrgGroups path={siteRoot + 'org/groupadmin'} />
            <OrgLibraries path={siteRoot + 'org/repoadmin'} />
            <OrgLinks path={siteRoot + 'org/publinkadmin'} />
            <OrgDepartments path={siteRoot + 'org/departmentadmin'}>
              <OrgDepartmentsList path='/' />
              <OrgDepartmentItem path={newPath} />
            </OrgDepartments>
            <OrgLogs
              path={siteRoot + 'org/logadmin'}
              currentTab={currentTab} 
              tabItemClick={this.tabItemClick}
            >
              <OrgLogsFileAudit path='/' currentTab={currentTab} />
              <OrgLogsFileUpdate path={siteRoot + 'file-update'} currentTab={currentTab} />
              <OrgLogsPermAudit path={siteRoot + 'perm-audit'} currentTab={currentTab} />
            </OrgLogs>
          </Router>
        </MainPanel>
      </div>
    );
  }
}

ReactDOM.render(
  <Org />,
  document.getElementById('wrapper')
);
