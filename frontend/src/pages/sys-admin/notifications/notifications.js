import React, { Component, Fragment } from 'react';
import { Button } from 'reactstrap';
import { Utils } from '../../../utils/utils';
import { seafileAPI } from '../../../utils/seafile-api';
import { gettext } from '../../../utils/constants';
import toaster from '../../../components/toast';
import EmptyTip from '../../../components/empty-tip';
import Loading from '../../../components/loading';
import OpMenu from '../../../components/dialog/op-menu';
import CommonOperationConfirmationDialog from '../../../components/dialog/common-operation-confirmation-dialog';
import SysAdminAddSysNotificationDialog from '../../../components/dialog/sysadmin-dialog/sysadmin-add-sys-notification-dialog';
import MainPanelTopbar from '../main-panel-topbar';

class Content extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isItemFreezed: false
    };
  }

  onFreezedItem = () => {
    this.setState({isItemFreezed: true});
  }

  onUnfreezedItem = () => {
    this.setState({isItemFreezed: false});
  }

  render() {
    const { loading, errorMsg, items } = this.props;
    if (loading) {
      return <Loading />;
    } else if (errorMsg) {
      return <p className="error text-center mt-4">{errorMsg}</p>;
    } else {
      const emptyTip = (
        <EmptyTip>
          <h2>{gettext('No notifications')}</h2>
        </EmptyTip>
      );
      const table = (
        <table>
          <thead>
            <tr>
              <th width="95%">{gettext('Notification Detail')}</th>
              <th width="5%">{/*Operations*/}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => {
              return (<Item
                key={index}
                item={item}
                isItemFreezed={this.state.isItemFreezed}
                onFreezedItem={this.onFreezedItem}
                onUnfreezedItem={this.onUnfreezedItem}
                deleteNotification={this.props.deleteNotification}
                setToCurrent={this.props.setToCurrent}
              />);
            })}
          </tbody>
        </table>
      );
      return items.length ? table : emptyTip;
    }
  }
}

class Item extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isOpIconShown: false,
      highlight: false,
      isDeleteDialogOpen: false
    };
  }

  handleMouseEnter = () => {
    if (!this.props.isItemFreezed) {
      this.setState({
        isOpIconShown: true,
        highlight: true
      });
    }
  }

  handleMouseLeave = () => {
    if (!this.props.isItemFreezed) {
      this.setState({
        isOpIconShown: false,
        highlight: false
      });
    }
  }

  onUnfreezedItem = () => {
    this.setState({
      highlight: false,
      isOpIconShow: false
    });
    this.props.onUnfreezedItem();
  }

  toggleDeleteDialog = (e) => {
    if (e) {
      e.preventDefault();
    }
    this.setState({isDeleteDialogOpen: !this.state.isDeleteDialogOpen});
  }

  deleteNotification = () => {
    this.props.deleteNotification(this.props.item.id);
    this.toggleDeleteDialog();
  }

  setToCurrent = () => {
    this.props.setToCurrent(this.props.item.id);
  }

  onMenuItemClick = (operation) => {
    switch(operation) {
      case 'Set to current':
        this.setToCurrent();
        break;
      case 'Delete':
        this.toggleDeleteDialog();
        break;
    }
  }

  translateOperations = (item) => {
    let translateResult = '';
    switch (item) {
      case 'Set to current':
        translateResult = gettext('Set to current');
        break;
      case 'Delete':
        translateResult = gettext('Delete');
        break;
      default:
        break;
    }
    return translateResult;
  }

  getOperations = () => {
    const { item } = this.props;
    let operations = [];
    if (!item.is_current) {
      operations.push('Set to current');
    }
    operations.push('Delete');
    return operations;
  }

  render() {
    const { item } = this.props;
    const { isOpIconShown, isDeleteDialogOpen } = this.state;

    return (
      <Fragment>
        <tr className={this.state.highlight ? 'tr-highlight' : ''} onMouseEnter={this.handleMouseEnter} onMouseLeave={this.handleMouseLeave}>
          <td>
            {item.msg}
            {item.is_current &&
              <span className="small text-orange">{gettext('(current notification)')}</span>
            }
          </td>
          <td>
            {isOpIconShown &&
            <OpMenu
              operations={this.getOperations()}
              translateOperations={this.translateOperations}
              onMenuItemClick={this.onMenuItemClick}
              onFreezedItem={this.props.onFreezedItem}
              onUnfreezedItem={this.onUnfreezedItem}
            />
            }
          </td>
        </tr>
        {isDeleteDialogOpen &&
          <CommonOperationConfirmationDialog
            title={gettext('Delete Notification')}
            message={gettext('Are you sure you want to delete the notification ?')}
            toggleDialog={this.toggleDeleteDialog}
            executeOperation={this.deleteNotification}
            confirmBtnText={gettext('Delete')}
          />
        }
      </Fragment>
    );
  }
}

class Notifications extends Component {

  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: '',
      notificationList: [],
      isAddNotificationDialogOpen: false
    };
  }

  componentDidMount () {
    seafileAPI.sysAdminListAllSysNotifications().then((res) => {
      this.setState({
        loading: false,
        notificationList: res.data.notifications
      });
    }).catch((error) => {
      this.setState({
        loading: false,
        errorMsg: Utils.getErrorMsg(error, true) // true: show login tip if 403
      });
    });
  }

  toggleAddNotificationDialog = () => {
    this.setState({isAddNotificationDialogOpen: !this.state.isAddNotificationDialogOpen});
  }

  addNotification = (msg) => {
    seafileAPI.sysAdminAddSysNotification(msg).then(res => {
      let notificationList = this.state.notificationList;
      notificationList.unshift(res.data.notification);
      this.setState({notificationList: notificationList});
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  deleteNotification = (id) => {
    seafileAPI.sysAdminDeleteSysNotification(id).then(res => {
      let notificationList = this.state.notificationList.filter(item => {
        return item.id != id;
      });
      this.setState({notificationList: notificationList});
      toaster.success(gettext('Successfully deleted 1 item.'));
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  setToCurrent = (id) => {
    seafileAPI.sysAdminSetSysNotificationToCurrent(id).then(res => {
      let notificationList = this.state.notificationList.map(item => {
        if (item.id == id) {
          item.is_current = true;
        } else {
          item.is_current = false;
        }
        return item;
      });
      this.setState({notificationList: notificationList});
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  render() {
    const { isAddNotificationDialogOpen } = this.state;
    return (
      <Fragment>
        <MainPanelTopbar {...this.props}>
          <Button className="btn btn-secondary operation-item" onClick={this.toggleAddNotificationDialog}>{gettext('Add new notification')}</Button>
        </MainPanelTopbar>
        <div className="main-panel-center flex-row">
          <div className="cur-view-container">
            <div className="cur-view-path">
              <h3 className="sf-heading">{gettext('All Notifications')}</h3>
            </div>
            <div className="cur-view-content">
              <Content
                loading={this.state.loading}
                errorMsg={this.state.errorMsg}
                items={this.state.notificationList}
                deleteNotification={this.deleteNotification}
                setToCurrent={this.setToCurrent}
              />
            </div>
          </div>
        </div>
        {isAddNotificationDialogOpen &&
          <SysAdminAddSysNotificationDialog
            addNotification={this.addNotification}
            toggle={this.toggleAddNotificationDialog}
          />
        }
      </Fragment>
    );
  }
}

export default Notifications;
