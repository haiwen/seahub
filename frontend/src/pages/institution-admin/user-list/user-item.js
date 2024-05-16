import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Link } from '@gatsbyjs/reach-router';
import Selector from '../../../components/single-selector';
import { gettext, username } from '../../../utils/constants';
import { Utils } from '../../../utils/utils';
import moment from 'moment';

const OPERATIONS =[
  {
    value: 'active',
    text: gettext('active'),
    is_active: true,
    isSelected: false,
  },
  {
    value: 'inactive',
    text: gettext('inactive'),
    is_active: false,
    isSelected: false,
  },
];

const UserItem = ({ user, deleteInstUser, updateInstUserStatus }) => {
  const [highlight, setHighlight] = useState(false);
  const [isOpIconShow, setIsOpIconSHow] = useState(false);

  const operations = OPERATIONS.map(item => {
    if (user.is_active === item.is_active) {
      item.isSelected = true;
    } else {
      item.isSelected = false;
    }
    return item;
  });
  const currentSelection = operations.find(item => item.isSelected);

  const handleMouseEnter = () => {
    setHighlight(true);
    setIsOpIconSHow(true);
  };

  const handleMouseLeave = () => {
    setHighlight(false);
    setIsOpIconSHow(false);
  };

  const updateStatus = () => {
    updateInstUserStatus(user);
  };

  const deleteCurrentUser = () => {
    deleteInstUser(user);
  };

  return (
    <tr className={`${highlight ? 'hl' : ''}`} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <td>
        <Link to={`/inst/useradmin/${encodeURIComponent(user.email)}`}>{user.email}</Link>
        <br/>
        {user.name}
        <br/>
        {user.contact_email}
      </td>
      <td>
        <Selector
          isDropdownToggleShown={highlight}
          currentSelectedOption={currentSelection}
          options={operations}
          selectOption={updateStatus}
        />
      </td>
      <td>
        {`${Utils.bytesToSize(user.quota_usage)} / ${user.quota_total > 0 ? Utils.bytesToSize(user.quota_total) : '--'}`}
      </td>
      <td>
        {`${user.create_time ? moment(user.create_time).format('YYYY-MM-DD HH:mm') : '--'} /`}
        <br />
        {`${user.last_login ? moment(user.last_login).fromNow() : '--'}`}
        <br />
        {`${user.last_access_time ? moment(user.last_access_time).fromNow() : '--'}`}
      </td>
      <td>
        {isOpIconShow && !user.is_institution_admin && !user.is_system_admin && user.email !== username && (
          <span className='sf-link' onClick={deleteCurrentUser}>{gettext('Delete')}</span>
        )}
      </td>
    </tr>
  );
};

UserItem.propTypes = {
  user: PropTypes.object.isRequired,
  deleteInstUser: PropTypes.func.isRequired,
  updateInstUserStatus: PropTypes.func.isRequired,
};

export default UserItem;
