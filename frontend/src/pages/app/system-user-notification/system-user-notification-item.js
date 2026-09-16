import React from 'react';
import PropTypes from 'prop-types';
import { notificationAPI } from '@/api/notification-api';
import Icon from '@/components/icon';
import { gettext } from '@/utils/constants';

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
          <Icon symbol="close" />
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
