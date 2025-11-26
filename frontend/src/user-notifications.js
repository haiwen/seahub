import React from 'react';
import PropTypes from 'prop-types';
import classname from 'classnames';
import { Modal, ModalHeader, ModalBody, Dropdown, DropdownToggle, DropdownMenu, DropdownItem, TabPane, Nav, NavItem, NavLink, TabContent } from 'reactstrap';
import { Utils } from './utils/utils';
import { gettext } from './utils/constants';
import { seafileAPI } from './utils/seafile-api';
import Loading from './components/loading';
import NoticeItem from './components/common/notice-item';
import Icon from './components/icon';

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
      activeTab: 'general',
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

  getItems = (page, is_scroll = false) => {
    this.setState({ isLoading: true });
    if (this.state.activeTab === 'general') {
      seafileAPI.listNotifications(page, PER_PAGE).then((res) => {
        if (is_scroll) {
          this.setState({
            isLoading: false,
            items: [...this.state.items, ...res.data.notification_list],
            currentPage: page,
            hasNextPage: Utils.hasNextPage(page, PER_PAGE, res.data.count)
          });
        } else {
          this.setState({
            isLoading: false,
            items: [...res.data.notification_list],
            currentPage: page,
            hasNextPage: Utils.hasNextPage(page, PER_PAGE, res.data.count)
          });
        }
      }).catch((error) => {
        this.setState({
          isLoading: false,
          errorMsg: Utils.getErrorMsg(error, true) // true: show login tip if 403
        });
      });
    } else if (this.state.activeTab === 'discussion') {
      seafileAPI.listSdocNotifications(page, PER_PAGE).then((res) => {
        if (is_scroll) {
          this.setState({
            isLoading: false,
            items: [...this.state.items, ...res.data.notification_list],
            currentPage: page,
            hasNextPage: Utils.hasNextPage(page, PER_PAGE, res.data.count)
          });
        } else {
          this.setState({
            isLoading: false,
            items: [...res.data.notification_list],
            currentPage: page,
            hasNextPage: Utils.hasNextPage(page, PER_PAGE, res.data.count)
          });
        }

      }).catch((error) => {
        this.setState({
          isLoading: false,
          errorMsg: Utils.getErrorMsg(error, true) // true: show login tip if 403
        });
      });
    }

  };

  markAllRead = () => {
    if (this.state.activeTab === 'general') {
      seafileAPI.updateNotifications().then((res) => {
        this.setState({
          items: this.state.items.map(item => {
            item.seen = true;
            return item;
          })
        });
        this.props.updateTotalUnseenCount('general');
      }).catch((error) => {
        this.setState({
          isLoading: false,
          errorMsg: Utils.getErrorMsg(error, true) // true: show login tip if 403
        });
      });
    } else if (this.state.activeTab === 'discussion') {
      seafileAPI.updateSdocNotifications().then((res) => {
        this.setState({
          items: this.state.items.map(item => {
            item.seen = true;
            return item;
          })
        });
        this.props.updateTotalUnseenCount('discussion');
      }).catch((error) => {
        this.setState({
          isLoading: false,
          errorMsg: Utils.getErrorMsg(error, true) // true: show login tip if 403
        });
      });
    }

  };

  clearAll = () => {
    if (this.state.activeTab === 'general') {
      seafileAPI.deleteNotifications().then((res) => {
        this.setState({
          items: []
        });
        this.props.updateTotalUnseenCount('general');
      }).catch((error) => {
        this.setState({
          isLoading: false,
          errorMsg: Utils.getErrorMsg(error, true) // true: show login tip if 403
        });
      });
    } else if (this.state.activeTab === 'discussion') {
      seafileAPI.deleteSdocNotifications().then((res) => {
        this.setState({
          items: []
        });
        this.props.updateTotalUnseenCount('discussion');
      }).catch((error) => {
        this.setState({
          isLoading: false,
          errorMsg: Utils.getErrorMsg(error, true) // true: show login tip if 403
        });
      });
    }
  };

  toggle = () => {
    this.props.onNotificationDialogToggle();
  };

  tabItemClick = (tab) => {
    if (tab === this.state.activeTab) return;
    this.setState({
      activeTab: tab,
      currentPage: 1
    }, () => {
      this.getItems(this.state.currentPage);
    });
  };

  toggleDropDownMenu = () => {
    this.setState({ isItemMenuShow: !this.state.isItemMenuShow });
  };

  onHandleScroll = () => {
    if (!this.state.hasNextPage || this.state.isLoading || !this.tableRef) {
      return;
    }
    if (this.notificationTableRef.offsetHeight + this.notificationTableRef.scrollTop + 1 >= this.tableRef.offsetHeight) {
      this.getItems(this.state.currentPage + 1, true);
    }
  };

  renderHeaderRowBtn = () => {
    return (
      <div className="notification-header-close">
        <Dropdown isOpen={this.state.isItemMenuShow} toggle={this.toggleDropDownMenu}>
          <DropdownToggle
            data-toggle="dropdown"
            aria-expanded={this.state.isItemMenuShow}
            className="notification-dropdown-toggle seahub-modal-btn border-0 p-0 bg-transparent"
            aria-label={gettext('More operations')}
          >
            <span className="seahub-modal-btn-inner">
              <Icon symbol="more-level" className="w-4 h-4" />
            </span>
          </DropdownToggle>
          <DropdownMenu className="dtable-dropdown-menu large">
            <DropdownItem onClick={this.markAllRead}>{gettext('Mark all read')}</DropdownItem>
            <DropdownItem onClick={this.clearAll}>{gettext('Clear')}</DropdownItem>
          </DropdownMenu>
        </Dropdown>
        <button type="button" className="close seahub-modal-btn" aria-label={gettext('Close')} onClick={this.toggle}>
          <span className="seahub-modal-btn-inner">
            <Icon symbol="x-01" className="w-4 h-4" />
          </span>
        </button>
      </div>
    );
  };

  renderNoticeContent = (content) => {
    const { generalNoticeListUnseen, discussionNoticeListUnseen } = this.props;
    let activeTab = this.state.activeTab;
    return (
      <>
        <div className="notice-dialog-side">
          <Nav pills className="flex-column w-100">
            <NavItem className="w-100" role="tab" aria-selected={activeTab === 'general'} aria-controls="general-notice-panel">
              <NavLink
                className={classname('w-100 mr-0', { 'active': activeTab === 'general' })}
                onClick={() => this.tabItemClick('general')}
                onKeyDown={Utils.onKeyDown}
                tabIndex="0"
                value="general"
              >
                {gettext('General')}
                {generalNoticeListUnseen > 0 && <span className="pl-1">({generalNoticeListUnseen})</span>}
              </NavLink>
            </NavItem>
            <NavItem className="w-100" role="tab" aria-selected={activeTab === 'discussion'} aria-controls="discussion-notice-panel">
              <NavLink
                className={classname('w-100 mr-0', { 'active': activeTab === 'discussion' })}
                onClick={() => this.tabItemClick('discussion')}
                onKeyDown={Utils.onKeyDown}
                tabIndex="0"
                value="discussion"
              >
                {gettext('Discussion')}
                {discussionNoticeListUnseen > 0 && <span className="pl-1">({discussionNoticeListUnseen})</span>}
              </NavLink>
            </NavItem>
          </Nav>
        </div>
        <div className="notice-dialog-main">
          <TabContent activeTab={this.state.activeTab}>
            {activeTab === 'general' &&
              <TabPane tabId="general" role="tabpanel" id="general-notice-panel" className="h-100">
                <div className="notification-dialog-body" ref={ref => this.notificationTableRef = ref} onScroll={this.onHandleScroll}>
                  {content}
                </div>
              </TabPane>
            }
            {activeTab === 'discussion' &&
              <TabPane tabId="discussion" role="tabpanel" id="discussion-notice-panel" className="h-100">
                <div className="notification-dialog-body" ref={ref => this.notificationTableRef = ref} onScroll={this.onHandleScroll}>
                  {content}
                </div>
              </TabPane>
            }
          </TabContent>
        </div>
      </>
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
        { width: '2%', text: '' },
        { width: '15%', text: gettext('User') },
        { width: '63%', text: gettext('Message') },
        { width: '20%', text: gettext('Update time') }
      ] : [
        { width: '2%', text: '' },
        { width: '13%', text: gettext('User') },
        { width: '52%', text: gettext('Message') },
        { width: '33%', text: gettext('Update time') }
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
              return (
                <NoticeItem key={index} noticeItem={item} tr={true} />
              );
            })}
          </tbody>
        </table>
      );
      if (isLoading) {
        content = <>{content}<Loading /></>;
      }
    }

    return (
      <Modal
        isOpen={true}
        size={'lg'}
        toggle={this.toggle}
        className="notification-list-dialog"
        contentClassName="notification-list-content"
        zIndex={1046}
      >
        <ModalHeader close={this.renderHeaderRowBtn()} toggle={this.toggle}>{gettext('Notifications')}</ModalHeader>
        <ModalBody className="notification-modal-body">
          {this.renderNoticeContent(content)}
        </ModalBody>
      </Modal>
    );
  }
}

UserNotificationsDialog.propTypes = {
  onNotificationDialogToggle: PropTypes.func.isRequired
};

export default UserNotificationsDialog;
