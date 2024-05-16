import React from 'react';
import MainPanelTopbar from '../sys-admin/main-panel-topbar';
import UserList from './user-list';
import { Router } from '@gatsbyjs/reach-router';
import UserContent from './user-content';
import UsersNav from './users-nav';
import UserInfo from './user-content/user-info';
import UserRepos from './user-content/user-repos';
import UserGroups from './user-content/user-groups';
import { siteRoot } from '../../utils/constants';

export default function MainPanel() {
  const getSearch = () => {};

  return (
    <div className='main-panel'>
      <MainPanelTopbar search={getSearch()}></MainPanelTopbar>
      <div className="main-panel-center flex-row">
        <div className="cur-view-container">
          <UsersNav />
          <Router style={{ display: 'flex', width: '100%', height: '100%' }}>
            <UserList path={siteRoot + '/inst/useradmin/'} />
            <UserContent path={siteRoot + '/inst/useradmin/:email'}>
              <UserInfo path="/" />
              <UserRepos path='/owned-libraries' />
              <UserGroups path="/groups" />
            </UserContent>
          </Router>
        </div>
      </div>
    </div>
  );
}
