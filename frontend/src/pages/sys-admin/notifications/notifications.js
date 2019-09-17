import React, { Component, Fragment } from 'react';
import { Button } from 'reactstrap';
import { seafileAPI } from '../../../utils/seafile-api';
import { loginUrl, gettext } from '../../../utils/constants';
import toaster from '../../../components/toast';
import { Utils } from '../../../utils/utils';
import EmptyTip from '../../../components/empty-tip';
import Loading from '../../../components/loading';
import MainPanelTopbar from '../main-panel-topbar';
import SysAdminAddSysNotificationDialog from '../../../components/dialog/sysadmin-dialog/sysadmin-add-sys-notification-dialog';
import CommonOperationDialog from '../../../components/dialog/common-operation-dialog';

class Content extends Component {

  constructor(props) {
    super(props);
  }

  render() {
    const { loading, errorMsg, items } = this.props;
    if (loading) {
      return <Loading />;
    } else if (errorMsg) {
      return <p className="error text-center">{errorMsg}</p>;
    } else {
      const emptyTip = (
        <EmptyTip>
          <h2>{gettext('No notifications')}</h2>
        </EmptyTip>
      );
      const table = (
        <Fragment>
          <table className="table-hover">
            <thead>
              <tr>
                <th width="85%">{gettext('Notification Detail')}</th>
                <th width="15%">{gettext('Operations')}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                return (<Item
                  key={index}
                  item={item}
                  deleteNotification={this.props.deleteNotification}
                  setToCurrent={this.props.setToCurrent}
                />);
              })}
            </tbody>
          </table>
        </Fragment>
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
      isDeleteDialogOpen: false
    };
  }

  handleMouseEnter = () => {
    this.setState({isOpIconShown: true});
  }

  handleMouseLeave = () => {
    this.setState({isOpIconShown: false});
  }

  toggleDeleteDialog = (e) => {
    if (e) {
      e.preventDefault();
    }
    this.setState({isDeleteDialogOpen: !this.state.isDeleteDialogOpen});
  }

  deleteNotification = () => {
    this.props.deleteNotification(this.props.item.id)
    this.toggleDeleteDialog();
  }

  setToCurrent = () => {
    this.props.setToCurrent(this.props.item.id);
  }

  render() {
    let {item } = this.props;
    let { isOpIconShown, isDeleteDialogOpen } = this.state;

    let msg = '<span class="op-target">' + Utils.HTMLescape(item.msg) + '</span>';
    let deleteDialogMsg = gettext('Are you sure you want to delete {placeholder} ?').replace('{placeholder}', msg);

    return (
      <Fragment>
        <tr onMouseEnter={this.handleMouseEnter} onMouseLeave={this.handleMouseLeave}>
          <td>{item.msg}
            {item.is_current &&
            <span dangerouslySetInnerHTML={{__html: '<span class="op-target">' + gettext('(current notification)') + '</span>'}}></span>
            }
          </td>
          <td>
            {isOpIconShown &&
            <Fragment>
              {!item.is_current &&
                <a href="#" className="mr-2" title={gettext('Set to current')} onClick={this.setToCurrent}>{gettext('Set to current')}</a>
              }
              <a href="#" title={gettext('Delete')} onClick={this.toggleDeleteDialog}>{gettext('Delete')}</a>
            </Fragment>
            }
          </td>
        </tr>
        {isDeleteDialogOpen &&
          <CommonOperationDialog
            title={gettext('Delete Notification')}
            message={deleteDialogMsg}
            toggle={this.toggleDeleteDialog}
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
      isAddNotificationDialogOpen: false,
    };
  }

  componentDidMount () {
    seafileAPI.sysAdminListAllSysNotifications().then((res) => {
      this.setState({
        loading: false,
        notificationList: res.data.notifications
      });
    }).catch((error) => {
      if (error.response) {
        if (error.response.status == 403) {
          this.setState({
            loading: false,
            errorMsg: gettext('Permission denied')
          }); 
          location.href = `${loginUrl}?next=${encodeURIComponent(location.href)}`;
        } else {
          this.setState({
            loading: false,
            errorMsg: gettext('Error')
          });
        }
      } else {
        this.setState({
          loading: false,
          errorMsg: gettext('Please check the network.')
        });
      }
    });
  }

  toggleAddNotificationDialog = () => {
    this.setState({isAddNotificationDialogOpen: !this.state.isAddNotificationDialogOpen})
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
    let { isAddNotificationDialogOpen } = this.state;
    return (
      <Fragment>
        <MainPanelTopbar>
          <Button className="btn btn-secondary operation-item" onClick={this.toggleAddNotificationDialog}>{gettext('Add new notification')}</Button>
        </MainPanelTopbar>
        <div className="main-panel-center flex-row">
          <div className="cur-view-container">
            <div className="cur-view-path tab-nav-container">
              <ul className="nav">
                <li className="nav-item mt-3 mb-3">
                  {gettext('All Notifications')}
                </li>
              </ul>
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
            toggle={this.toggleAddNotificationDialog}
            addNotification={this.addNotification}
          />
        }
      </Fragment>
    );
  }
}

export default Notifications;