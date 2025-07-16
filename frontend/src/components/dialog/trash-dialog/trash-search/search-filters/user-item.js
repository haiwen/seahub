import React from 'react';
import PropTypes from 'prop-types';
import { mediaUrl } from '../../../../../utils/constants';
import IconBtn from '../../../../icon-btn';

const UserItem = ({ user, isCancellable, onCancel }) => {
  return (
    <div className="user-item">
      <img src={user.avatar_url || `${mediaUrl}avatars/default.png`} alt={user.name} className="user-avatar" />
      <span className="user-name">{user.name}</span>
      {isCancellable && <IconBtn className="user-remove" onClick={(e) => onCancel(e, user.name)} symbol="x-01" />}
    </div>
  );
};

UserItem.propTypes = {
  user: PropTypes.object.isRequired,
  isCancellable: PropTypes.bool,
  onCancel: PropTypes.func,
};

export default UserItem;
