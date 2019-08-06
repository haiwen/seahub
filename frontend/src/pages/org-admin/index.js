// Import React!
import React from 'react';
import ReactDOM from 'react-dom';
import { Router } from '@reach/router';
import { siteRoot } from '../../utils/constants';
import SidePanel from './side-panel';
import OrgUsers from './org-users';
import OrgUserProfile from './org-user-profile';
import OrgUserRepos from './org-user-repos';
import OrgUserSharedRepos from './org-user-shared-repos';
import OrgGroups from './org-groups';
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
      currentTab: 'users',
    };
  }

  componentDidMount() {
    let href = window.location.href.split('/');
    let currentTab = href[href.length - 2];

    if (location.href.indexOf(`${siteRoot}org/useradmin`) != -1) {
      currentTab = 'users';
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
        <div className="main-panel o-hidden">
          <Router className="reach-router">
            <OrgInfo path={siteRoot + 'org/orgmanage'}/>
            <OrgUsers path={siteRoot + 'org/useradmin'} currentTab={currentTab} tabItemClick={this.tabItemClick}/>
            <OrgUserProfile path={siteRoot + 'org/useradmin/info/:email/'} />
            <OrgUserRepos path={siteRoot + 'org/useradmin/info/:email/repos/'} />
            <OrgUserSharedRepos path={siteRoot + 'org/useradmin/info/:email/shared-repos/'} />
            <OrgGroups path={siteRoot + 'org/groupadmin'} />
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
          </Router>
        </div>
      </div>
    );
  }
}

ReactDOM.render(
  <Org />,
  document.getElementById('wrapper')
);
