import React from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { gettext, enableShowContactEmailWhenSearchUser, enableShowLoginIDWhenSearchUser } from '../../utils/constants';

import './index.css';

const propTypes = {
  user: PropTypes.shape({
    name: PropTypes.string.isRequired,
    avatar_url: PropTypes.string.isRequired,
    email: PropTypes.string,
    contact_email: PropTypes.string,
    login_id: PropTypes.string,
  }),
  className: PropTypes.string,
  enableDeleteUser: PropTypes.bool,
  onDeleteUser: PropTypes.func,
};

class UserItem extends React.Component {

  onDeleteUser = (event) => {
    event.stopPropagation();
    event && event.nativeEvent.stopImmediatePropagation();
    this.props.onDeleteUser(this.props.user);
  };

  render() {
    const { className, user, enableDeleteUser } = this.props;
    const { name, avatar_url, contact_email, login_id } = user;
    return (
      <div className={classnames('user-item', className)} title={name}>
        <span className="user-avatar">
          <img className="user-avatar-icon" alt={name} src={avatar_url} />
        </span>
        <div className="d-flex align-items-center">
          <span className="user-name">{name}</span>
          {(enableShowContactEmailWhenSearchUser && !enableDeleteUser) && <span className="user-option-email">({contact_email})</span>}
          {(enableShowLoginIDWhenSearchUser && !enableDeleteUser) && <span className="user-option-email">({login_id})</span>}
        </div>
        {enableDeleteUser && (
          <span className="user-remove ml-2" onClick={this.onDeleteUser} title={gettext('Remove')}>
            <i className="sf3-font sf3-font-x-01" aria-hidden="true"></i>
          </span>
        )}
      </div>
    );
  }
}

UserItem.propTypes = propTypes;

export default UserItem;
