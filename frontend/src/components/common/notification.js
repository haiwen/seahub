import React from 'react';
import { seafileAPI } from '../../utils/seafile-api';
import { gettext, siteRoot } from '../../utils/constants';

class Notification extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      showNotice: false,
      notice_html: '',
      unseenCount: 0,
    };
  }

  componentDidMount() {
    seafileAPI.getUnseenNotificationCount().then(res => {
      this.setState({unseenCount: res.data.unseen_count});
    });
  }

  onClick = () => {
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
    seafileAPI.listPopupNotices().then(res => {
      this.setState({
        notice_html: res.data.notice_html
      });
    });
  }

  render() {
    const { notice_html } = this.state;

    return (
      <div id="notifications">
        <a href="#" onClick={this.onClick} className="no-deco" id="notice-icon" title="Notifications" aria-label="Notifications">
          <span className="sf2-icon-bell"></span>
          <span className={`num ${this.state.unseenCount ? '' : 'hide'}`}>{this.state.unseenCount}</span>
        </a>
        <div id="notice-popover" className={`sf-popover ${this.state.showNotice ? '': 'hide'}`}>
          <div className="outer-caret up-outer-caret"><div className="inner-caret"></div></div>
          <div className="sf-popover-hd ovhd">
            <h3 className="sf-popover-title title">{gettext('Notifications')}</h3>
            <a href="#" onClick={this.onClick} title={gettext('Close')} aria-label={gettext('Close')} className="sf-popover-close js-close sf2-icon-x1 action-icon float-right"></a>
          </div>
          <div className="sf-popover-con">
            <ul className="notice-list" dangerouslySetInnerHTML={{__html: notice_html}}></ul>
            <a href={siteRoot + 'notification/list/'} className="view-all">{gettext('See All Notifications')}</a>
          </div>
        </div>
      </div>
    );
  }
}

export default Notification;
