import React from 'react';
import MainPanelTopbar from '../sys-admin/main-panel-topbar';
import UserList from './user-list';
import { Router, navigate } from '@gatsbyjs/reach-router';
import UserContent from './user-content';
import UsersNav from './users-nav';
import UserInfo from './user-content/user-info';
import UserRepos from './user-content/user-repos';
import UserGroups from './user-content/user-groups';
import { gettext, siteRoot } from '../../utils/constants';
import Search from '../sys-admin/search';
import UserListSearch from './user-list-search';

export default function MainPanel(props) {


  const searchItems = (keyword) => {
    navigate(`${siteRoot}inst/useradmin/search/?query=${encodeURIComponent(keyword)}`);
  };

  const getSearch = () => {
    // offer 'Search' for 'DB' & 'LDAPImported' users
    return <Search placeholder={gettext('Search users')} submit={searchItems} />;
  };

  return (
    <div className='main-panel'>
      <MainPanelTopbar search={getSearch()} {...props}></MainPanelTopbar>
      <div className="main-panel-center flex-row">
        <div className="cur-view-container">
          <Router>
            <UsersNav path={siteRoot + '/inst/useradmin/*'} />
          </Router>
          <Router style={{ display: 'flex', width: '100%', height: '100%', flexDirection: 'column' }}>
            <UserList path={siteRoot + '/inst/useradmin'} />
            <UserListSearch path={siteRoot + '/inst/useradmin/search'} />
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
