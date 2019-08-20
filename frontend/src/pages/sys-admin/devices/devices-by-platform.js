import React, { Component, Fragment } from 'react';
import { seafileAPI } from '../../../utils/seafile-api';
import { gettext } from '../../../utils/constants';
import toaster from '../../../components/toast';
import { Utils } from '../../../utils/utils';
import EmptyTip from '../../../components/empty-tip';
import moment from 'moment';
import Loading from '../../../components/loading';
import AdminPaginator from '../admin-paginator';
import SysAdminDeleteDeviceDialog from '../../../components/dialog/sysadmin-dialog/sysadmin-delete-device-dialog';

class Content extends Component {

  constructor(props) {
    super(props);
    this.state = {
      currentDeviceInfo: {}
    };
  }

  getPreviousPageDevicesList = () => {
    this.props.getDevicesListByPage(this.props.pageInfo.current_page - 1);
  }

  getNextPageDevicesList = () => {
    this.props.getDevicesListByPage(this.props.pageInfo.current_page + 1);
  }

  render() {
    const { loading, errorMsg, items, pageInfo } = this.props;
    if (loading) {
      return <Loading />;
    } else if (errorMsg) {
      return <p className="error text-center">{errorMsg}</p>;
    } else {
      const emptyTip = (
        <EmptyTip>
          <h2>{gettext('No connected devices')}</h2>
        </EmptyTip>
      );
      const table = (
        <Fragment>
          <table className="table-hover">
            <thead>
              <tr>
                <th width="19%">{gettext('User')}</th>
                <th width="19%">{gettext('Platform')}{' / '}{gettext('Version')}</th>
                <th width="19%">{gettext('Device Name')}</th>
                <th width="19%">{gettext('IP')}</th>
                <th width="19%">{gettext('Last Access')}</th>
                <th width="5%">{/*Operations*/}</th>
              </tr>
            </thead>
            {items && 
              <tbody>
                {items.map((item, index) => {
                  return (<Item key={index} item={item} unlinkDevice={this.props.unlinkDevice}/>);
                })}
              </tbody>
            }
          </table>
          {/* this page has no reset perpage option in old version, if new version need 
          this option, just uncomment this.props.resetPerPage, 
          and set canResetPerPage to true */}
          <AdminPaginator
            gotoPreviousPage={this.getPreviousPageDevicesList}
            gotoNextPage={this.getNextPageDevicesList}
            currentPage={pageInfo.current_page}
            hasNextPage={pageInfo.has_next_page}
            canResetPerPage={false}
            //resetPerPage={this.props.resetPerPage}
          />
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
      showOpIcon: false,
      isShowUnlinkDeviceDialog: false,
      isWipeDevice: false,
    };
  }

  handleMouseOver = () => {
    this.setState({showOpIcon: true});
  }

  handleMouseOut = () => {
    this.setState({showOpIcon: false});
  }

  toggleUnlinkDeviceDialog = () => {
    this.setState({isShowUnlinkDeviceDialog: !this.state.isShowUnlinkDeviceDialog});
  }

  toggleIsWipeDevice = () => {
    this.setState({isWipeDevice: !this.state.isWipeDevice});
  }

  unlinkDevice = () => {
    this.props.unlinkDevice(this.props.item, this.state.isWipeDevice);
    this.toggleUnlinkDeviceDialog();
  }

  render() {
    let { isShowUnlinkDeviceDialog, isWipeDevice } = this.state;
    let { item } = this.props;
    let iconVisibility = this.state.showOpIcon ? '' : ' invisible'; 
    let deleteIconClassName = 'sf2-icon-delete action-icon' + iconVisibility;
    return (
      <Fragment>
        <tr onMouseEnter={this.handleMouseOver} onMouseLeave={this.handleMouseOut}>
          <td>{item.user}</td>
          <td>{item.platform}{' / '}{item.client_version}</td>
          <td>{item.device_name}</td>
          <td>{item.last_login_ip}</td>
          <td>
            <span className="item-meta-info" title={moment(item.last_accessed).format('llll')}>{moment(item.last_accessed).fromNow()}</span>
          </td>
          <td>
            <a href="#" className={deleteIconClassName} title={gettext('Remove')} onClick={this.toggleUnlinkDeviceDialog}></a>
          </td>
        </tr>
        {isShowUnlinkDeviceDialog &&
          <SysAdminDeleteDeviceDialog
            toggle={this.toggleUnlinkDeviceDialog}
            toggleIsWipeDevice={this.toggleIsWipeDevice}
            isWipeDevice={isWipeDevice}
            unlinkDevice={this.unlinkDevice}
          />
        }
      </Fragment>
    );
  }
}

class DevicesByPlatform extends Component {

  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: '',
      devicesData: {},
      pageInfo: {},
      perPage: 50
    };
  }

  componentDidMount () {
    this.getDevicesListByPage(1);   // init enter the first page
  }

  getDevicesListByPage = (page) => {
    let platform = this.props.devicesPlatform;
    let per_page = this.state.perPage;
    seafileAPI.sysAdminlistDevices(platform, page, per_page).then((res) => {
      this.setState({
        devicesData: res.data.devices,
        pageInfo: res.data.page_info,
        loading: false
      });
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  unlinkDevice = (item, isWipeDevice) => {
    let { platform, device_id, user } = item;
    seafileAPI.sysAdminUnlinkDevice(platform, device_id, user, isWipeDevice).then((res) => {
      let items = this.state.devicesData.filter(eachItem => {
        return eachItem.platform !== platform || eachItem.device_id !== device_id || eachItem.user !== user;
      });
      this.setState({devicesData: items});
      let message = gettext('Successfully unlinked the device.');
      toaster.success(message);
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  // this page has no reset perpage option in old version, if new version need 
  // this option, just uncomment resetPerPage, 
  // and set canResetPerPage to true

  // resetPerPage = (perPage) => {
  //   this.setState({
  //     perPage: perPage
  //   }, () => {
  //     this.getDevicesListByPage(1);
  //   });
  // }

  render() {
    return (
      <div className="cur-view-content">
        <Content
          getDevicesListByPage={this.getDevicesListByPage}
          unlinkDevice={this.unlinkDevice}
          toggleModal={this.toggleModal}
          resetPerPage={this.resetPerPage}
          loading={this.state.loading}
          errorMsg={this.state.errorMsg}
          items={this.state.devicesData}
          pageInfo={this.state.pageInfo}
        />
      </div>
    );
  }
}

export default DevicesByPlatform;
