import React from 'react';
import NotificationPopover from './notification-popover';
import { seafileAPI } from '../../utils/seafile-api';
import { gettext } from '../../utils/constants';
import NoticeItem from './notice-item';
import UserNotificationsDialog from '../../user-notifications';
import { Utils } from '../../utils/utils';
import '../../css/notification.css';

class Notification extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      showNotice: false,
      unseenCount: 0,
      generalNoticeList: [],
      discussionNoticeList: [],
      currentTab: 'general',
      isShowNotificationDialog: this.getInitDialogState(),
    };
  }

  componentDidMount() {
    seafileAPI.listAllNotifications().then(res => {
      let unseen_count = res.data.general.unseen_count + res.data.discussion.unseen_count;
      this.setState({ unseenCount: unseen_count });
    });
  }

  onClick = (e) => {
    e.preventDefault();
    if (this.state.showNotice) {
      seafileAPI.updateNotifications();
      this.setState({
        showNotice: false,
        unseenCount: 0
      });
    } else {
      this.loadNotices();
      this.setState({ showNotice: true });
    }
  };

  tabItemClick = (tab) => {
    const { currentTab } = this.state;
    if (currentTab === tab) return;
    this.setState({
      showNotice: true,
      currentTab: tab
    });
  };

  loadNotices = () => {
    let page = 1;
    let perPage = 5;
    seafileAPI.listAllNotifications(page, perPage).then(res => {
      let generalNoticeList = res.data.general.notification_list;
      let discussionNoticeList = res.data.discussion.notification_list;
      this.setState({
        generalNoticeList: generalNoticeList,
        discussionNoticeList: discussionNoticeList
      });
    });
  };

  onNoticeItemClick = (noticeItem) => {
    if (this.state.currentTab === 'general') {
      let noticeList = this.state.generalNoticeList.map(item => {
        if (item.id === noticeItem.id) {
          item.seen = true;
        }
        return item;
      });
      let unseenCount = this.state.unseenCount === 0 ? 0 : this.state.unseenCount - 1;
      this.setState({
        generalNoticeList: noticeList,
        unseenCount: unseenCount,
      });
      seafileAPI.markNoticeAsRead(noticeItem.id);
    }
    if (this.state.currentTab === 'discussion') {
      let noticeList = this.state.discussionNoticeList.map(item => {
        if (item.id === noticeItem.id) {
          item.seen = true;
        }
        return item;
      });
      let unseenCount = this.state.unseenCount === 0 ? 0 : this.state.unseenCount - 1;
      this.setState({
        discussionNoticeList: noticeList,
        unseenCount: unseenCount,
      });
      seafileAPI.markSdocNoticeAsRead(noticeItem.id);
    }

  };

  getInitDialogState = () => {
    const searchParams = Utils.getUrlSearches();
    return searchParams.notifications === 'all';
  };

  onNotificationDialogToggle = () => {
    let newSearch = this.state.isShowNotificationDialog ? null : 'all';
    Utils.updateSearchParameter('notifications', newSearch);
    this.setState({ isShowNotificationDialog: !this.state.isShowNotificationDialog });
  };

  onNotificationListToggle = () => {
    this.setState({ showNotice: false });
  };

  onMarkAllNotifications = () => {
    seafileAPI.updateAllNotifications().then(() => {
      this.setState({
        unseenCount: 0,
      });
    }).catch((error) => {
      this.setState({
        errorMsg: Utils.getErrorMsg(error, true)
      });
    });
  };

  render() {
    const { unseenCount, currentTab } = this.state;
    return (
      <div id="notifications">
        <a href="#" onClick={this.onClick} className="no-deco" id="notice-icon" title={gettext('Notifications')} aria-label={gettext('Notifications')}>
          <span className="sf2-icon-bell" id="notification-popover"></span>
          <span className={`num ${unseenCount ? '' : 'hide'}`}>{unseenCount}</span>
        </a>
        {this.state.showNotice &&
          <NotificationPopover
            headerText={gettext('Notification')}
            bodyText={gettext('Mark all as read')}
            footerText={gettext('View all notifications')}
            currentTab={currentTab}
            onNotificationListToggle={this.onNotificationListToggle}
            onNotificationDialogToggle={this.onNotificationDialogToggle}
            onMarkAllNotifications={this.onMarkAllNotifications}
            tabItemClick={this.tabItemClick}
          >
            {this.state.currentTab === 'general' &&
              <ul className="notice-list list-unstyled" id="notice-popover">
                {this.state.generalNoticeList.map(item => {
                  return (<NoticeItem key={item.id} noticeItem={item} onNoticeItemClick={this.onNoticeItemClick}/>);
                })}
              </ul>
            }
            {this.state.currentTab === 'discussion' &&
              <ul className="notice-list list-unstyled" id="notice-popover">
                {this.state.discussionNoticeList.map(item => {
                  return (<NoticeItem key={item.id} noticeItem={item} onNoticeItemClick={this.onNoticeItemClick}/>);
                })}
              </ul>
            }
          </NotificationPopover>
        }
        {this.state.isShowNotificationDialog &&
          <UserNotificationsDialog onNotificationDialogToggle={this.onNotificationDialogToggle} />
        }
      </div>
    );
  }
}

export default Notification;
