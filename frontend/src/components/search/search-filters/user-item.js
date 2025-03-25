import React from 'react';
import { mediaUrl } from '../../../utils/constants';
import IconBtn from '../../icon-btn';

const UserItem = ({ user, isCancellable, onCancel }) => {
  const defaultAvatar = `${mediaUrl}avatars/default.png`;
  return (
    <div className="user-item">
      <img src={user.avatar_url || defaultAvatar} alt={user.name} className="user-avatar" />
      <span className="user-name">{user.name}</span>
      {isCancellable && <IconBtn className="user-remove" onClick={(e) => onCancel(e, user)} symbol="x-01" />}
    </div>
  );
};

export default UserItem;
