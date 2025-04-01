import React from 'react';
import PropTypes from 'prop-types';
import { Popover } from 'reactstrap';
import { gettext } from '../../../utils/constants';
import SeahubModalCloseIcon from '../seahub-modal-close';

import './index.css';

class NotificationPopover extends React.Component {

  componentDidMount() {
    document.addEventListener('mousedown', this.handleOutsideClick, true);
  }

  componentWillUnmount() {
    document.removeEventListener('mousedown', this.handleOutsideClick, true);
  }

  handleOutsideClick = (e) => {
    if (!this.notificationContainerRef.contains(e.target) && !document.getElementById('notice-icon').contains(e.target)) {
      this.props.onNotificationListToggle();
    }
  };

  onNotificationDialogToggle = () => {
    this.props.onNotificationDialogToggle();
    this.props.onNotificationListToggle();
  };

  onHandleScroll = () => {
    if (this.notificationListRef.offsetHeight + this.notificationListRef.scrollTop + 1 >= this.notificationsWrapperRef.offsetHeight) {
      this.props.listNotifications && this.props.listNotifications();
    }
  };

  tabItemClick = (tab) => {
    this.props.tabItemClick(tab);
  };

  render() {
    const { headerText = '', bodyText = '', footerText = '', currentTab, generalNoticeListUnseen, discussionNoticeListUnseen } = this.props;
    return (
      <Popover
        className="notification-wrapper"
        target="notification-popover"
        isOpen={true}
        fade={false}
        hideArrow={true}
        placement="bottom"
      >
        <div className="notification-container" ref={ref => this.notificationContainerRef = ref}>
          <div className="notification-header modal">
            {headerText}
            <SeahubModalCloseIcon toggle={this.props.onNotificationListToggle} />
          </div>
          <div className="notification-body">
            <div className="mark-notifications">
              <ul className="nav">
                <li className="nav-item" onClick={() => this.tabItemClick('general')}>
                  <span className={`nav-link ${currentTab === 'general' ? 'active' : ''}`}>
                    {gettext('General')}
                    {generalNoticeListUnseen > 0 && <span>({generalNoticeListUnseen})</span>}
                  </span>
                </li>
                <li className="nav-item" onClick={() => this.tabItemClick('discussion')}>
                  <span className={`nav-link ${currentTab === 'discussion' ? 'active' : ''}`}>
                    {gettext('Discussion')}
                    {discussionNoticeListUnseen > 0 && <span>({discussionNoticeListUnseen})</span>}
                  </span>
                </li>
              </ul>
              <span className="mark-all-read" onClick={this.props.onMarkAllNotifications}>
                {bodyText}
              </span>
            </div>
            {currentTab === 'general' &&
            <div className="notification-list-container" onScroll={this.onHandleScroll} ref={ref => this.notificationListRef = ref}>
              <div ref={ref => this.notificationsWrapperRef = ref}>
                {this.props.children}
              </div>
            </div>
            }
            {currentTab === 'discussion' &&
            <div className="notification-list-container" onScroll={this.onHandleScroll} ref={ref => this.notificationListRef = ref}>
              <div ref={ref => this.notificationsWrapperRef = ref}>
                {this.props.children}
              </div>
            </div>
            }
            <div className="notification-footer" onClick={this.onNotificationDialogToggle}>{footerText}</div>
          </div>
        </div>
      </Popover>
    );
  }
}

NotificationPopover.propTypes = {
  headerText: PropTypes.string.isRequired,
  bodyText: PropTypes.string.isRequired,
  footerText: PropTypes.string.isRequired,
  onNotificationListToggle: PropTypes.func,
  onNotificationDialogToggle: PropTypes.func,
  listNotifications: PropTypes.func,
  onMarkAllNotifications: PropTypes.func,
  tabItemClick: PropTypes.func,
  children: PropTypes.any,
  currentTab: PropTypes.string,
  generalNoticeListUnseen: PropTypes.number,
  discussionNoticeListUnseen: PropTypes.number,
};

export default NotificationPopover;
