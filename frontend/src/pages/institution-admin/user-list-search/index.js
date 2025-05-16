import React, { useCallback, useEffect, useState } from 'react';
import { useLocation } from '@gatsbyjs/reach-router';
import Loading from '../../../components/loading';
import { gettext } from '../../../utils/constants';
import CommonOperationConfirmationDialog from '../../../components/dialog/common-operation-confirmation-dialog';
import UserItem from '../user-list/user-item';
import instAdminAPI from '../api';
import { Utils } from '../../../utils/utils';

const UserListSearch = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [userList, setUserList] = useState([]);
  const [deleteUser, setDeleteUser] = useState(null);
  const [deleteMessage, setDeleteMessage] = useState('');
  const [isShowDeleteUserDialog, setIsShowDeleteDialog] = useState(false);

  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const q = params.get('query');
    instAdminAPI.searchInstitutionUsers(q).then(res => {
      const { user_list } = res.data;
      setUserList(user_list);
      setIsLoading(false);
    });
  }, [location.search]);

  const deleteInstUserToggle = useCallback((user) => {
    if (user) {
      const deleteMessage = gettext('Are you sure you want to delete {placeholder} ?').replace('{placeholder}', Utils.HTMLescape(user.name));
      setDeleteUser(user);
      setDeleteMessage(deleteMessage);
    }
    setIsShowDeleteDialog(!isShowDeleteUserDialog);
  }, [isShowDeleteUserDialog]);

  const deleteInstUser = useCallback(() => {
    instAdminAPI.deleteInstitutionUser(deleteUser.email).then(res => {
      const newUserList = userList.filter(item => item.email !== deleteUser.email);
      setUserList(newUserList);
    });
  }, [deleteUser?.email, userList]);

  const updateInstUserStatus = useCallback((user) => {
    const is_active = user.is_active ? false : true;
    instAdminAPI.updateInstitutionUserStatus(user.email, is_active).then(res => {
      const newUserList = userList.map(item => {
        if (item.email === user.email) {
          item.is_active = is_active;
        }
        return item;
      });
      setUserList(newUserList);
    });
  }, [userList]);


  if (isLoading) {
    return <Loading />;
  }

  return (
    <div className="cur-view-content">
      <table>
        <thead>
          <tr>
            <th width="36%">{gettext('Email')} / {gettext('Name')} / {gettext('Contact Email')}</th>
            <th width="12%">{gettext('Status')}</th>
            <th width="16%">{gettext('Space Used')}</th>
            <th width="22%">{gettext('Create At')} / {gettext('Last Login')}</th>
            <th width="14%">{gettext('Operations')}</th>
          </tr>
        </thead>
        <tbody>
          {userList.map((user) => {
            return (
              <UserItem
                key={user.email}
                user={user}
                deleteInstUser={deleteInstUserToggle}
                updateInstUserStatus={updateInstUserStatus}
              />
            );
          })}
        </tbody>
      </table>
      {isShowDeleteUserDialog && (
        <CommonOperationConfirmationDialog
          title={gettext('Delete User')}
          message={deleteMessage}
          executeOperation={deleteInstUser}
          confirmBtnText={gettext('Delete')}
          toggleDialog={deleteInstUserToggle}
        />
      )}
    </div>
  );
};

export default UserListSearch;
