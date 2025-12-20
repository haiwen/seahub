import React from 'react';
import PropTypes from 'prop-types';
import { gettext, mediaUrl } from '../../../utils/constants';
import { Utils } from '../../../utils/utils';
import IconBtn from '../../icon-btn';

const UserItem = ({ user, isCancellable, onCancel }) => {
  return (
    <div className="user-item">
      <img src={user.avatar_url || `${mediaUrl}avatars/default.png`} alt={user.name} className="user-avatar" />
      <span className="user-name text-truncate" title={user.name}>{user.name}</span>
      {isCancellable && (
        <IconBtn
          className="user-remove"
          onClick={(e) => onCancel(e, user.name)}
          onKeyDown={Utils.onKeyDown}
          symbol="close"
          tabIndex="0"
          role="button"
          aria-label={gettext('Delete')}
        />
      )}
    </div>
  );
};

UserItem.propTypes = {
  user: PropTypes.object.isRequired,
  isCancellable: PropTypes.bool,
  onCancel: PropTypes.func,
};

export default UserItem;
