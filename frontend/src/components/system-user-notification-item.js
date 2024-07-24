import React from 'react';
import { gettext } from '../utils/constants';
import { notificationAPI } from '../utils/notification-api';
import '../css/system-notification.css';
import PropTypes from 'prop-types';

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
        <span className="mr-3" aria-hidden="true"></span>
        <p id="info-bar-info" className="m-0" dangerouslySetInnerHTML={{ __html: this.props.msg }}></p>
        <button className="close sf2-icon-x1" title={gettext('Close')} aria-label={gettext('Close')} onClick={this.close}></button>
      </div>
    );
  }
}

SystemUserNotificationItem.propTypes = {
  msg: PropTypes.string.isRequired,
  notificationID: PropTypes.number.isRequired,
};
export default SystemUserNotificationItem;
