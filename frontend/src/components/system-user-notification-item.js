import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../utils/constants';
import { notificationAPI } from '../utils/notification-api';
import Icon from './icon';

import '../css/system-notification.css';

class SystemUserNotificationItem extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isClosed: false
    };
  }

  close = () => {
    this.setState({ isClosed: true });
    notificationAPI.setSysUserNotificationToSeen(this.props.notificationID);
  };

  render() {
    if (this.state.isClosed) {
      return null;
    }
    return (
      <div id="info-bar" className="d-flex justify-content-between">
        <p id="info-bar-info" className="m-0" dangerouslySetInnerHTML={{ __html: this.props.msg }}></p>
        <span title={gettext('Close')} aria-label={gettext('Close')} onClick={this.close} role="button">
          <Icon symbol="x-01" />
        </span>
      </div>
    );
  }
}

SystemUserNotificationItem.propTypes = {
  msg: PropTypes.string.isRequired,
  notificationID: PropTypes.number.isRequired,
};

export default SystemUserNotificationItem;
