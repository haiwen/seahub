import React from 'react';
import PropTypes from 'prop-types';
import { Popover } from 'reactstrap';
import './index.css';

export default class NotificationPopover extends React.Component {

  static propTypes = {
    headerText: PropTypes.string.isRequired,
    bodyText: PropTypes.string.isRequired,
    footerText: PropTypes.string.isRequired,
    onNotificationListToggle: PropTypes.func,
    onNotificationDialogToggle: PropTypes.func,
    listNotifications: PropTypes.func,
    onMarkAllNotifications: PropTypes.func,
    children: PropTypes.any,
  };

  static defaultProps = {
    headerText: '',
    bodyText: '',
    footerText: '',
  };

  componentDidMount() {
    document.addEventListener('mousedown', this.handleOutsideClick);
  }

  componentWillUnmount() {
    document.removeEventListener('mousedown', this.handleOutsideClick);
  }

  handleOutsideClick = (e) => {
    if (!this.notificationContainerRef.contains(e.target)) {
      document.removeEventListener('mousedown', this.handleOutsideClick);
      if (e.target.className === 'tool notification' || e.target.parentNode.className === 'tool notification') {
        return;
      }
      this.props.onNotificationListToggle();
    }
  }

  onNotificationDialogToggle = () => {
    this.props.onNotificationDialogToggle();
    this.props.onNotificationListToggle();
  }

  onHandleScroll = () => {
    if (this.notificationListRef.offsetHeight + this.notificationListRef.scrollTop + 1 >= this.notificationsWrapperRef.offsetHeight) {
      this.props.listNotifications && this.props.listNotifications();
    }
  }

  render() {
    const { headerText, bodyText, footerText } = this.props;
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
          <div className="notification-header">
            {headerText}
            <span className="sf3-font sf3-font-x-01 notification-close-icon" onClick={this.props.onNotificationListToggle}></span>
          </div>
          <div className="notification-body">
            <div className="mark-notifications" onClick={this.props.onMarkAllNotifications}>{bodyText}</div>
            <div className="notification-list-container" onScroll={this.onHandleScroll} ref={ref => this.notificationListRef = ref}>
              <div ref={ref => this.notificationsWrapperRef = ref}>
                {this.props.children}
              </div>
            </div>
            <div className="notification-footer" onClick={this.onNotificationDialogToggle}>{footerText}</div>
          </div>
        </div>
      </Popover>
    );
  }
}
