import React, { useCallback, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import Loading from '../../../components/loading';
import { gettext } from '../../../utils/constants';
import Paginator from '../../../components/paginator';
import CommonOperationConfirmationDialog from '../../../components/dialog/common-operation-confirmation-dialog';
import UserItem from './user-item';
import instAdminAPI from '../api';
import { Utils } from '../../../utils/utils';

const UserList = ({ onUserLinkClick }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [userList, setUserList] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [curPerPage, setCurPrePage] = useState(100);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [deleteUser, setDeleteUser] = useState(null);
  const [deleteMessage, setDeleteMessage] = useState('');
  const [isShowDeleteUserDialog, setIsShowDeleteDialog] = useState(false);

  useEffect(() => {
    instAdminAPI.listInstitutionUsers(currentPage, curPerPage).then(res => {
      const { user_list, total_count } = res.data;
      setUserList(user_list);
      if (user_list.length >= total_count) {
        setHasNextPage(false);
      }
      setIsLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getPreviousPage = useCallback(() => {
    if (curPerPage === 1) return;
    const newPage = currentPage - 1;
    setCurrentPage(newPage);
    instAdminAPI.listInstitutionUsers(newPage, curPerPage).then(res => {
      const { user_list, total_count } = res.data;
      setUserList(user_list);
      if (newPage * curPerPage >= total_count) {
        setHasNextPage(false);
      }
    });
  }, [curPerPage, currentPage]);

  const getNextPage = useCallback(() => {
    if (!hasNextPage) return;
    const newPage = currentPage + 1;
    setCurrentPage(newPage);
    instAdminAPI.listInstitutionUsers(newPage, curPerPage).then(res => {
      const { user_list, total_count } = res.data;
      setUserList(user_list);
      if (newPage * curPerPage >= total_count) {
        setHasNextPage(false);
      }
    });
  }, [curPerPage, currentPage, hasNextPage]);

  const resetPerPage = useCallback((perPage) => {
    setCurPrePage(perPage);
    instAdminAPI.listInstitutionUsers(1, perPage).then(res => {
      const { user_list, total_count } = res.data;
      setUserList(user_list);
      if (1 * curPerPage >= total_count) {
        setHasNextPage(false);
      }
    });
  }, [curPerPage]);

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
                onUserLinkClick={onUserLinkClick}
                deleteInstUser={deleteInstUserToggle}
                updateInstUserStatus={updateInstUserStatus}
              />
            );
          })}
        </tbody>
      </table>
      {hasNextPage && (
        <Paginator
          hasNextPage={hasNextPage}
          currentPage={currentPage}
          curPerPage={curPerPage}
          gotoNextPage={getNextPage}
          gotoPreviousPage={getPreviousPage}
          resetPerPage={resetPerPage}
        />
      )}
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

UserList.propTypes = {
  onUserLinkClick: PropTypes.func,
};

export default UserList;
