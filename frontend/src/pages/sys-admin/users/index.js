import React, { useEffect, useMemo, useState } from 'react';
import { Button } from 'reactstrap';
import { Router, useLocation, navigate } from '@gatsbyjs/reach-router';
import MainPanelTopbar from '../main-panel-topbar';
import { gettext, siteRoot } from '../../../utils/constants';
import UsersNav from './users-nav';
import Users from './users';
import Search from '../search';
import AdminUsers from './admin-users';
import LDAPImportedUsers from './ldap-imported-users';
import LDAPUsers from './ldap-users';
import UserNav from './user-nav';
import toaster from '../../../components/toast';
import { Utils } from '../../../utils/utils';
import { systemAdminAPI } from '../../../utils/system-admin-api';
import { eventBus } from '../../../components/common/event-bus';
import { EVENT_BUS_TYPE } from '../../../components/common/event-bus-type';

import './index.css';

const UsersLayout = ({ ...commonProps }) => {
  const [sortBy, setSortBy] = useState('');
  const [sortOrder, setSortOrder] = useState('asc');
  const [perPage, setPerPage] = useState(100);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasUserSelected, setHasUserSelected] = useState(false);
  const [isImportUserDialogOpen, setIsImportUserDialogOpen] = useState(false);
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [isBatchSetQuotaDialogOpen, setIsBatchSetQuotaDialogOpen] = useState(false);
  const [isBatchDeleteUserDialogOpen, setIsBatchDeleteUserDialogOpen] = useState(false);
  const [isBatchAddAdminDialogOpen, setIsBatchAddAdminDialogOpen] = useState(false);

  const location = useLocation();
  const { curTab, isAdmin, isLDAPImported } = useMemo(() => {
    const path = location.pathname.split('/').filter(Boolean).pop();
    let curTab = path;
    if (path === 'users') {
      curTab = 'database';
    } else if (path === 'admins') {
      curTab = 'admin';
    }
    const isAdmin = curTab === 'admin';
    const isLDAPImported = curTab === 'ldap-imported';
    return { curTab, isAdmin, isLDAPImported };
  }, [location.pathname]);

  const onHasUserSelected = (hasSelected) => {
    setHasUserSelected(hasSelected);
  };

  const toggleImportUserDialog = () => {
    setIsImportUserDialogOpen(!isImportUserDialogOpen);
  };

  const toggleAddUserDialog = () => {
    setIsAddUserDialogOpen(!isAddUserDialogOpen);
  };

  const toggleBatchSetQuotaDialog = () => {
    setIsBatchSetQuotaDialogOpen(!isBatchSetQuotaDialogOpen);
  };

  const toggleBatchDeleteUserDialog = () => {
    setIsBatchDeleteUserDialogOpen(!isBatchDeleteUserDialogOpen);
  };

  const toggleBatchAddAdminDialog = () => {
    setIsBatchAddAdminDialogOpen(!isBatchAddAdminDialogOpen);
  };

  const sortByQuotaUsage = (sortBy, sortOrder) => {
    setSortBy(sortBy);
    setSortOrder(sortOrder);
    setCurrentPage(1);
  };

  const getOperationsForAll = () => {
    if (isAdmin) {
      return <Button className="btn btn-secondary operation-item" onClick={toggleBatchAddAdminDialog}>{gettext('Add Admin')}</Button>;
    }

    if (isLDAPImported) {
      return <a className="btn btn-secondary operation-item" href={`${siteRoot}sys/useradmin/export-excel/`}>{gettext('Export Excel')}</a>;
    }

    // 'database'
    return (
      <>
        <Button className="btn btn-secondary operation-item" onClick={toggleImportUserDialog}>{gettext('Import Users')}</Button>
        <Button className="btn btn-secondary operation-item" onClick={toggleAddUserDialog}>{gettext('Add User')}</Button>
        <a className="btn btn-secondary operation-item" href={`${siteRoot}sys/useradmin/export-excel/`}>{gettext('Export Excel')}</a>
      </>
    );
  };

  const getSearch = () => {
    if (isAdmin) {
      return null;
    }
    // offer 'Search' for 'DB' & 'LDAPImported' users
    return <Search
      placeholder={gettext('Search users')}
      submit={(keyword) => navigate(`${siteRoot}sys/search-users/?query=${encodeURIComponent(keyword)}`)}
    />;
  };

  const usersProps = {
    curTab,
    isAdmin,
    isLDAPImported,
    isAddUserDialogOpen,
    isImportUserDialogOpen,
    isBatchAddAdminDialogOpen,
    isBatchDeleteUserDialogOpen,
    isBatchSetQuotaDialogOpen,
    onHasUserSelected,
    toggleAddUserDialog,
    toggleImportUserDialog,
    toggleBatchAddAdminDialog,
    toggleBatchDeleteUserDialog,
    toggleBatchSetQuotaDialog
  };

  useEffect(() => {
    const urlParams = new URL(window.location).searchParams;
    setSortBy(urlParams.get('order_by') || sortBy);
    setSortOrder(urlParams.get('direction') || sortOrder);
    setCurrentPage(parseInt(urlParams.get('page') || currentPage));
    setPerPage(parseInt(urlParams.get('per_page') || perPage));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <MainPanelTopbar search={getSearch()} {...commonProps}>
        {hasUserSelected ?
          <>
            <Button className="btn btn-secondary operation-item" onClick={toggleBatchSetQuotaDialog}>{gettext('Set Quota')}</Button>
            <Button className="btn btn-secondary operation-item" onClick={toggleBatchDeleteUserDialog}>{gettext('Delete Users')}</Button>
          </>
          : getOperationsForAll()
        }
      </MainPanelTopbar>
      <UsersNav currentItem={curTab} sortBy={sortBy} sortOrder={sortOrder} sortItems={sortByQuotaUsage} />
      <Router className="d-flex overflow-hidden">
        <Users
          default
          sortBy={sortBy}
          sortOrder={sortOrder}
          perPage={perPage}
          currentPage={currentPage}
          {...usersProps}
        />
        <AdminUsers path="admins" perPage={perPage} {...usersProps} />
        <LDAPImportedUsers path="ldap-imported" {...usersProps} />
        <LDAPUsers path="ldap" {...usersProps} />
      </Router>
    </>
  );
};

const UserLayout = ({ email, children, ...commonProps }) => {
  const [username, setUsername] = useState('');
  const location = useLocation();
  const path = location.pathname.split('/').filter(Boolean).pop();
  let curTab = 'info';
  if (path === 'owned-libraries') {
    curTab = 'owned-repos';
  } else if (path === 'shared-libraries') {
    curTab = 'shared-repos';
  } else if (path === 'shared-links') {
    curTab = 'links';
  } else if (path === 'groups') {
    curTab = 'groups';
  }

  useEffect(() => {
    if (curTab !== 'info' && username === '') {
      systemAdminAPI.sysAdminGetUser(decodeURIComponent(email)).then((res) => {
        setUsername(res.data.name);
      }).catch((error) => {
        toaster.danger(Utils.getErrorMsg(error, true));
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const unsubscribeUsername = eventBus.subscribe(EVENT_BUS_TYPE.SYNC_USERNAME, (username) => {
      setUsername(username);
    });

    return () => {
      unsubscribeUsername();
    };
  }, []);

  return (
    <>
      <MainPanelTopbar {...commonProps} />
      <UserNav currentItem={curTab} email={email} userName={username} />
      <div className="sys-admin-user-layout w-100 h-100 d-flex overflow-auto">{children}</div>
    </>
  );
};

export { UsersLayout, UserLayout };
