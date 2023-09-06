import React from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalHeader, ModalBody, Dropdown, DropdownToggle, DropdownMenu, DropdownItem } from 'reactstrap';
import { Utils } from './utils/utils';
import { gettext } from './utils/constants';
import { seafileAPI } from './utils/seafile-api';
import Loading from './components/loading';
import Paginator from './components/paginator';
import NoticeItem from './components/common/notice-item';

import './css/toolbar.css';
import './css/search.css';
import './css/user-notifications.css';

class UserNotificationsDialog extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isLoading: true,
      errorMsg: '',
      currentPage: 1,
      perPage: 25,
      hasNextPage: false,
      items: [],
      isItemMenuShow: false,
    };
  }

  componentDidMount() {
    let urlParams = (new URL(window.location)).searchParams;
    const {
      currentPage, perPage
    } = this.state;
    this.setState({
      perPage: parseInt(urlParams.get('per_page') || perPage),
      currentPage: parseInt(urlParams.get('page') || currentPage)
    }, () => {
      this.getItems(this.state.currentPage);
    });
  }

  getItems = (page) => {
    const { perPage } = this.state;
    seafileAPI.listNotifications(page, perPage).then((res) => {
      this.setState({
        isLoading: false,
        items: res.data.notification_list,
        currentPage: page,
        hasNextPage: Utils.hasNextPage(page, perPage, res.data.count)
      });
    }).catch((error) => {
      this.setState({
        isLoading: false,
        errorMsg: Utils.getErrorMsg(error, true) // true: show login tip if 403
      });
    });
  };

  resetPerPage = (perPage) => {
    this.setState({
      perPage: perPage
    }, () => {
      this.getItems(1);
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

  renderHeaderRowBtn = () => {
    return (
      <div className="use">
        <Dropdown isOpen={this.state.isItemMenuShow} toggle={this.toggleDropDownMenu}>
          <DropdownToggle tag="span" data-toggle="dropdown" aria-expanded={this.state.isItemMenuShow} className="notification-dropdown-toggle">
            <i title="More Operations" data-toggle="dropdown" aria-expanded="true" aria-haspopup="true" className="d-flex w-5 h-5 align-items-center justify-content-center sf-dropdown-toggle fa fa-ellipsis-v">
              <span class="sr-only">{gettext('Toggle Dropdown')}</span>
            </i>
          </DropdownToggle>
          <DropdownMenu right={true} className="dtable-dropdown-menu large">
            <DropdownItem onClick={this.markAllRead}>{gettext('Mark all read')}</DropdownItem>
            <DropdownItem onClick={this.clearAll}>{gettext('Clear')}</DropdownItem>
          </DropdownMenu>
        </Dropdown>
        <button type="button" className="close" aria-label="Close" onClick={this.toggle}><span aria-hidden="true">×</span></button>
      </div>
    );
  }

  render() {
    const headerRowBtn = this.renderHeaderRowBtn();
    return (
      <Modal isOpen={true} toggle={this.toggle} className="notification-list-dialog" contentClassName="notification-list-content"
        zIndex={1046}>
        <ModalHeader close={headerRowBtn} toggle={this.toggle}>{gettext('Notifications')}</ModalHeader>
        <ModalBody className="notification-modal-body">
          <div className="notification-dialog-body" ref={ref => this.notificationTableRef = ref}>
            <Content
              isLoading={this.state.isLoading}
              errorMsg={this.state.errorMsg}
              items={this.state.items}
              currentPage={this.state.currentPage}
              hasNextPage={this.state.hasNextPage}
              curPerPage={this.state.perPage}
              resetPerPage={this.resetPerPage}
              getListByPage={this.getItems}
            />
          </div>
        </ModalBody>
      </Modal>
    );
  }
}

class Content extends React.Component {

  getPreviousPage = () => {
    this.props.getListByPage(this.props.currentPage - 1);
  }

  getNextPage = () => {
    this.props.getListByPage(this.props.currentPage + 1);
  }

  render() {
    const { isLoading, errorMsg, items, curPerPage, currentPage, hasNextPage } = this.props;

    if (isLoading) {
      return <Loading />;
    }

    if (errorMsg) {
      return <p className="error mt-6 text-center">{errorMsg}</p>;
    }

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

    return (
      <React.Fragment>
        <table className="table-hover">
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
        {items.length > 0 &&
        <Paginator
          gotoPreviousPage={this.getPreviousPage}
          gotoNextPage={this.getNextPage}
          currentPage={currentPage}
          hasNextPage={hasNextPage}
          curPerPage={curPerPage}
          resetPerPage={this.props.resetPerPage}
        />
        }
      </React.Fragment>
    );
  }
}

UserNotificationsDialog.propTypes = {
  onNotificationDialogToggle: PropTypes.func.isRequired,
};

export default UserNotificationsDialog;
