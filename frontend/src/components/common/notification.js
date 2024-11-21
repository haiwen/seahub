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
      noticeList: [],
      currentTab: 'general',
      isShowNotificationDialog: this.getInitDialogState(),
    };
  }

  componentDidMount() {
    seafileAPI.getUnseenNotificationCount().then(res => {
      this.setState({ unseenCount: res.data.unseen_count });
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
     }, () => {
      this.loadNotices();
     });
  };

  loadNotices = () => {
    let page = 1;
    let perPage = 5;
    if (this.state.currentTab === 'general') {
      seafileAPI.listNotifications(page, perPage).then(res => {
        let noticeList = res.data.notification_list;
        this.setState({ noticeList: noticeList });
      });
    }
    if (this.state.currentTab === 'discussion') {
      seafileAPI.listSdocNotifications(page, perPage).then(res => {
        let noticeList = res.data.notification_list;
        console.log(noticeList)
        this.setState({ noticeList: noticeList });
      });
    }

  };

  onNoticeItemClick = (noticeItem) => {
    let noticeList = this.state.noticeList.map(item => {
      if (item.id === noticeItem.id) {
        item.seen = true;
      }
      return item;
    });
    seafileAPI.markNoticeAsRead(noticeItem.id);
    let unseenCount = this.state.unseenCount === 0 ? 0 : this.state.unseenCount - 1;
    this.setState({
      noticeList: noticeList,
      unseenCount: unseenCount,
    });

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
    seafileAPI.updateNotifications().then(() => {
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
            <ul className="notice-list list-unstyled" id="notice-popover">
              {this.state.noticeList.map(item => {
                return (<NoticeItem key={item.id} noticeItem={item} onNoticeItemClick={this.onNoticeItemClick}/>);
              })}
            </ul>
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
