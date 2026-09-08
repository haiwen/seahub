import React from 'react';
import SystemUserNotificationItem from './system-user-notification-item';
import { notificationAPI } from '../../../utils/notification-api';

import '../system-notification/system-notification.css';

class SystemUserNotification extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      userNoteMsgs: []
    };
  }

  componentDidMount() {
    notificationAPI.listSysUserUnseenNotifications().then((res) => {
      this.setState({
        userNoteMsgs: res.data.notifications
      });
    });
  }

  render() {
    let { userNoteMsgs } = this.state;
    if (!userNoteMsgs) {
      return null;
    }
    const userNoteMsgItem = userNoteMsgs.map((item) => {
      return (
        <SystemUserNotificationItem
          key={item.id}
          msg={item.msg_format}
          notificationID={item.id}
        />
      );
    });
    return userNoteMsgItem;
  }
}

export default SystemUserNotification;
