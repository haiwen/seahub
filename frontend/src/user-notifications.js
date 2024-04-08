import React from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalHeader, ModalBody, Dropdown, DropdownToggle, DropdownMenu, DropdownItem } from 'reactstrap';
import { Utils } from './utils/utils';
import { gettext } from './utils/constants';
import { seafileAPI } from './utils/seafile-api';
import Loading from './components/loading';
import NoticeItem from './components/common/notice-item';

import './css/toolbar.css';
import './css/search.css';
import './css/user-notifications.css';

const PER_PAGE = 20;

class UserNotificationsDialog extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isLoading: true,
      errorMsg: '',
      currentPage: 1,
      hasNextPage: false,
      items: [],
      isItemMenuShow: false,
    };
  }

  componentDidMount() {
    let urlParams = (new URL(window.location)).searchParams;
    const { currentPage } = this.state;
    this.setState({
      currentPage: parseInt(urlParams.get('page') || currentPage)
    }, () => {
      this.getItems(this.state.currentPage);
    });
  }

  getItems = (page) => {
    this.setState({ isLoading: true });
    seafileAPI.listNotifications(page, PER_PAGE).then((res) => {
      this.setState({
        isLoading: false,
        items: [...this.state.items, ...res.data.notification_list],
        currentPage: page,
        hasNextPage: Utils.hasNextPage(page, PER_PAGE, res.data.count)
      });
    }).catch((error) => {
      this.setState({
        isLoading: false,
        errorMsg: Utils.getErrorMsg(error, true) // true: show login tip if 403
      });
    });
  };

  markAllRead = () => {
    seafileAPI.updateNotifications().then((res) => {
      this.setState({
        items: this.state.items.map(item => {
          item.seen = true;
          return item;
        })
      });
    }).catch((error) => {
      this.setState({
        isLoading: false,
        errorMsg: Utils.getErrorMsg(error, true) // true: show login tip if 403
      });
    });
  };

  clearAll = () => {
    seafileAPI.deleteNotifications().then((res) => {
      this.setState({
        items: []
      });
    }).catch((error) => {
      this.setState({
        isLoading: false,
        errorMsg: Utils.getErrorMsg(error, true) // true: show login tip if 403
      });
    });
  };

  toggle = () => {
    this.props.onNotificationDialogToggle();
  };

  toggleDropDownMenu = () => {
    this.setState({isItemMenuShow: !this.state.isItemMenuShow});
  };

  onHandleScroll = () => {
    if (!this.state.hasNextPage || this.state.isLoading ||!this.tableRef) {
      return;
    }
    if (this.notificationTableRef.offsetHeight + this.notificationTableRef.scrollTop + 1 >= this.tableRef.offsetHeight) {
      this.getItems(this.state.currentPage + 1);
    }
  };

  renderHeaderRowBtn = () => {
    return (
      <div className="notification-header-close">
        <Dropdown isOpen={this.state.isItemMenuShow} toggle={this.toggleDropDownMenu}>
          <DropdownToggle tag="span" data-toggle="dropdown" aria-expanded={this.state.isItemMenuShow} className="notification-dropdown-toggle">
            <span className="sf3-font sf3-font-more-level item-dropdown-icon"></span>
          </DropdownToggle>
          <DropdownMenu right={true} className="dtable-dropdown-menu large">
            <DropdownItem onClick={this.markAllRead}>{gettext('Mark all read')}</DropdownItem>
            <DropdownItem onClick={this.clearAll}>{gettext('Clear')}</DropdownItem>
          </DropdownMenu>
        </Dropdown>
        <span className="sf3-font sf3-font-x-01 notification-close-icon" onClick={this.toggle}></span>
      </div>
    );
  };

  render() {
    const { isLoading, errorMsg, items } = this.state;
    let content;
    if (errorMsg) {
      content = <p className="error mt-6 text-center">{errorMsg}</p>;
    }
    else {
      const isDesktop = Utils.isDesktop();
      const theadData = isDesktop ? [
        {width: '7%', text: ''},
        {width: '73%', text: gettext('Message')},
        {width: '20%', text: gettext('Time')}
      ] : [
        {width: '15%', text: ''},
        {width: '52%', text: gettext('Message')},
        {width: '33%', text: gettext('Time')}
      ];
      content = (
        <table className="table-hover" ref={ref => this.tableRef = ref}>
          <thead>
            <tr>
              {theadData.map((item, index) => {
                return <th key={index} width={item.width}>{item.text}</th>;
              })}
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => {
              return (<NoticeItem key={index} noticeItem={item} tr={true} />);
            })}
          </tbody>
        </table>
      );
      if (isLoading) {
        content = <>{content}<Loading /></>;
      }
    }

    return (
      <Modal isOpen={true} toggle={this.toggle} className="notification-list-dialog" contentClassName="notification-list-content"
        zIndex={1046}>
        <ModalHeader close={this.renderHeaderRowBtn()} toggle={this.toggle}>{gettext('Notifications')}</ModalHeader>
        <ModalBody className="notification-modal-body">
          <div className="notification-dialog-body" ref={ref => this.notificationTableRef = ref} onScroll={this.onHandleScroll}>
            {content}
          </div>
        </ModalBody>
      </Modal>
    );
  }
}

UserNotificationsDialog.propTypes = {
  onNotificationDialogToggle: PropTypes.func.isRequired,
};

export default UserNotificationsDialog;
