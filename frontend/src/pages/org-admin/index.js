// Import React!
import React from 'react';
import ReactDOM from 'react-dom';
import { Router } from '@reach/router';

import SidePanel from './side-panel';
import MainPanel from './main-panel';
import OrgUsers from './org-users';
import OrgUsersList from './org-users-list';
import OrgAdminList from './org-admin-list';

import { siteRoot } from '../../utils/constants';

// style
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
      currentTab: 'users',
    };
  }

  componentDidMount() {
    let href = window.location.href.split('/');
    let currentTab = href[href.length - 2];
    if (currentTab == 'useradmin') {
      currentTab = 'users';
    }
    this.setState({currentTab: currentTab});
  }

  onCloseSidePanel = () => {
    this.setState({
      isSidePanelClosed: !this.state.isSidePanelClosed
    })
  }

  tabItemClick = (param) => {
    this.setState({
      currentTab: param
    })           
  }  

  toggleAddOrgUser = () => {
    this.setState({
      isShowAddOrgUserDialog: !this.state.isShowAddOrgUserDialog
    });
  } 

  toggleAddOrgAdmin = () => {
    this.setState({
      isShowAddOrgAdminDialog: !this.state.isShowAddOrgAdminDialog
    });
  } 

  render() {
    return (
      <div id="main">
        <SidePanel isSidePanelClosed={this.state.isSidePanelClosed}
                   onCloseSidePanel={this.onCloseSidePanel}
        />
        <MainPanel>
          <Router>
            <OrgUsers path={siteRoot + "org/useradmin"}
                      currentTab={this.state.currentTab} 
                      tabItemClick={this.tabItemClick}
                      toggleAddOrgAdmin={this.toggleAddOrgAdmin} 
                      toggleAddOrgUser={this.toggleAddOrgUser} 
                      >
              <OrgUsersList path="/" currentTab={this.state.currentTab} 
                                     isShowAddOrgUserDialog={this.state.isShowAddOrgUserDialog}
                                     toggleAddOrgUser={this.toggleAddOrgUser} 
              />
              <OrgAdminList path="admins" currentTab={this.state.currentTab}
                                          isShowAddOrgAdminDialog={this.state.isShowAddOrgAdminDialog}
                                          toggleAddOrgAdmin={this.toggleAddOrgAdmin}
              />
            </OrgUsers>
          </Router>
        </MainPanel>
      </div>
    ) 
  }
}

ReactDOM.render(
    <Org />,
  document.getElementById('wrapper')
);
