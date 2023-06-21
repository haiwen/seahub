import React from 'react';
import { seafileAPI } from '../../utils/seafile-api';
import { gettext, siteRoot } from '../../utils/constants';
import NoticeItem from './notice-item';

class Notification extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      showNotice: false,
      unseenCount: 0,
      noticeList: [],
    };
  }

  componentDidMount() {
    seafileAPI.getUnseenNotificationCount().then(res => {
      this.setState({unseenCount: res.data.unseen_count});
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
      this.setState({showNotice: true});
    }
  }

  loadNotices = () => {
    let page = 1;
    let perPage = 5;
    seafileAPI.listNotifications(page, perPage).then(res => {
      let noticeList = res.data.notification_list;
      this.setState({noticeList: noticeList});
    });
  }

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

  }

  render() {

    return (
      <div id="notifications">
        <a href="#" onClick={this.onClick} className="no-deco" id="notice-icon" title={gettext('Notifications')} aria-label={gettext('Notifications')}>
          <span className="sf2-icon-bell"></span>
          <span className={`num ${this.state.unseenCount ? '' : 'hide'}`}>{this.state.unseenCount}</span>
        </a>
        <div id="notice-popover" className={`sf-popover ${this.state.showNotice ? '': 'hide'}`}>
          <div className="outer-caret up-outer-caret"><div className="inner-caret"></div></div>
          <div className="sf-popover-hd h-7 d-flex align-items-center justify-content-center">
            <h3 className="sf-popover-title title m-0">{gettext('Notifications')}</h3>
            <a href="#" onClick={this.onClick} title={gettext('Close')} aria-label={gettext('Close')} className="sf-popover-close js-close sf2-icon-x1 action-icon m-0"></a>
          </div>
          <div className="sf-popover-con">
            <ul className="notice-list list-unstyled">
              {this.state.noticeList.map(item => {
                return (<NoticeItem key={item.id} noticeItem={item} onNoticeItemClick={this.onNoticeItemClick}/>);
              })}
            </ul>
            <a href={siteRoot + 'notice/list/'} className="view-all">{gettext('See All Notifications')}</a>
          </div>
        </div>
      </div>
    );
  }
}

export default Notification;
