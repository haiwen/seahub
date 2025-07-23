import React from 'react';
import NotificationPopover from './notification-popover';
import { seafileAPI } from '../../utils/seafile-api';
import { gettext } from '../../utils/constants';
import NoticeItem from './notice-item';
import UserNotificationsDialog from '../../user-notifications';
import { Utils } from '../../utils/utils';
import IconBtn from '../icon-btn';

import '../../css/notification.css';

class Notification extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      showNotice: false,
      totalUnseenCount: 0,
      generalNoticeList: [],
      discussionNoticeList: [],
      currentTab: 'general',
      isShowNotificationDialog: this.getInitDialogState(),
    };
  }

  componentDidMount() {
    seafileAPI.listAllNotifications().then(res => {
      this.setState({
        totalUnseenCount: res.data.total_unseen_count,
        generalNoticeListUnseen: res.data.general.unseen_count,
        discussionNoticeListUnseen: res.data.discussion.unseen_count
      });
    });
  }

  onClick = (e) => {
    e.preventDefault();
    if (this.state.showNotice) {
      seafileAPI.updateNotifications();
      this.setState({
        showNotice: false,
        totalUnseenCount: 0
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
    let perPage = 25;
    seafileAPI.listAllNotifications(page, perPage).then(res => {
      let generalNoticeList = res.data.general.notification_list;
      let discussionNoticeList = res.data.discussion.notification_list;
      let generalNoticeListUnseen = res.data.general.unseen_count;
      let discussionNoticeListUnseen = res.data.discussion.unseen_count;
      this.setState({
        generalNoticeList: generalNoticeList,
        discussionNoticeList: discussionNoticeList,
        generalNoticeListUnseen: generalNoticeListUnseen,
        discussionNoticeListUnseen: discussionNoticeListUnseen
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
      let totalUnseenCount = this.state.totalUnseenCount === 0 ? 0 : this.state.totalUnseenCount - 1;
      let generalNoticeListUnseen = this.state.generalNoticeListUnseen === 0 ? 0 : this.state.generalNoticeListUnseen - 1;
      this.setState({
        generalNoticeList: noticeList,
        totalUnseenCount: totalUnseenCount,
        generalNoticeListUnseen: generalNoticeListUnseen
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
      let totalUnseenCount = this.state.totalUnseenCount === 0 ? 0 : this.state.totalUnseenCount - 1;
      let discussionNoticeListUnseen = this.state.discussionNoticeListUnseen === 0 ? 0 : this.state.discussionNoticeListUnseen - 1;
      this.setState({
        discussionNoticeList: noticeList,
        totalUnseenCount: totalUnseenCount,
        discussionNoticeListUnseen: discussionNoticeListUnseen
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
    let generalNoticeListUnseen = this.state.generalNoticeListUnseen;
    let discussionNoticeListUnseen = this.state.discussionNoticeListUnseen;
    if (this.state.currentTab === 'general') {
      seafileAPI.updateNotifications().then((res) => {
        this.setState({
          generalNoticeList: this.state.generalNoticeList.map(item => {
            item.seen = true;
            return item;
          }),
          generalNoticeListUnseen: 0,
          totalUnseenCount: discussionNoticeListUnseen
        });
      }).catch((error) => {
        this.setState({
          errorMsg: Utils.getErrorMsg(error, true) // true: show login tip if 403
        });
      });
    } else if (this.state.currentTab === 'discussion') {
      seafileAPI.updateSdocNotifications().then((res) => {
        this.setState({
          discussionNoticeList: this.state.discussionNoticeList.map(item => {
            item.seen = true;
            return item;
          }),
          discussionNoticeListUnseen: 0,
          totalUnseenCount: generalNoticeListUnseen
        });
      }).catch((error) => {
        this.setState({
          errorMsg: Utils.getErrorMsg(error, true) // true: show login tip if 403
        });
      });
    }
  };

  updateTotalUnseenCount = (noticeType) => {
    if (noticeType === 'general') {
      this.setState({
        generalNoticeListUnseen: 0,
        totalUnseenCount: this.state.discussionNoticeListUnseen
      });
    } else if (noticeType === 'discussion') {
      this.setState({
        discussionNoticeListUnseen: 0,
        totalUnseenCount: this.state.generalNoticeListUnseen
      });
    }
  };

  render() {
    const { totalUnseenCount, currentTab, generalNoticeList, discussionNoticeList, generalNoticeListUnseen, discussionNoticeListUnseen } = this.state;
    return (
      <div id="notifications">
        <a href="#" onClick={this.onClick} className="no-deco" id="notice-icon" title={gettext('Notifications')} aria-label={gettext('Notifications')}>
          <IconBtn id="notification-popover" symbol="notification" size={32} className="sf-icon-bell" />
          <span className={`num ${totalUnseenCount ? '' : 'hide'}`}>{totalUnseenCount < 1000 ? totalUnseenCount : '999+'}</span>
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
            generalNoticeListUnseen={generalNoticeListUnseen}
            discussionNoticeListUnseen={discussionNoticeListUnseen}
          >
            {currentTab === 'general' &&
              <ul className="notice-list list-unstyled" id="notice-popover">
                {generalNoticeList.map(item => {
                  return (
                    <NoticeItem key={item.id} noticeItem={item} onNoticeItemClick={this.onNoticeItemClick}/>
                  );
                })}
              </ul>
            }
            {currentTab === 'discussion' &&
              <ul className="notice-list list-unstyled" id="notice-popover">
                {discussionNoticeList.map(item => {
                  return (
                    <NoticeItem key={item.id} noticeItem={item} onNoticeItemClick={this.onNoticeItemClick}/>
                  );
                })}
              </ul>
            }
          </NotificationPopover>
        }
        {this.state.isShowNotificationDialog &&
          <UserNotificationsDialog
            onNotificationDialogToggle={this.onNotificationDialogToggle}
            generalNoticeListUnseen={generalNoticeListUnseen}
            discussionNoticeListUnseen={discussionNoticeListUnseen}
            updateTotalUnseenCount={this.updateTotalUnseenCount}
          />
        }
      </div>
    );
  }
}

export default Notification;
