import React, { Component, Fragment } from 'react';
import { Modal, ModalBody, ModalHeader, ModalFooter, Button, Label, Input, Form, FormGroup } from 'reactstrap';
import { seafileAPI } from '../../../utils/seafile-api';
import { gettext } from '../../../utils/constants';
import toaster from '../../../components/toast';
import { Utils } from '../../../utils/utils';
import EmptyTip from '../../../components/empty-tip';
import moment from 'moment';
import Loading from '../../../components/loading';
import AdminPagenator from '../admin-paginator';

class Content extends Component {

  constructor(props) {
    super(props);
    this.state = {
      modalOpen: false,
      isWipeDevice: false,
      currentDeviceInfo: {},
    };
  }

  // // required by `Modal`, and can only set the 'open' state
  toggleModal = () => {
    this.props.toggleModal();
  }

  showModal = (deviceInfo) => {
    this.props.toggleModal();
    this.setState({
      currentDeviceInfo: deviceInfo
    });
  }

  checkWipeDevice = (e) => {
    this.setState({isWipeDevice: e.target.checked});
  }

  unlinkDevice = () => {
    this.props.unlinkDevice(this.state.currentDeviceInfo, this.state.isWipeDevice);
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
                  return (<Item key={index} item={item} showModal={this.showModal}/>);
                })}
              </tbody>
            }
          </table>
          {/* this page has no reset perpage option in old version, if new version need 
          this option, just uncomment this.props.resetPerPage, 
          and set canResetPerPage to true */}
          <AdminPagenator
            gotoPreviousPage={this.getPreviousPageDevicesList}
            gotoNextPage={this.getNextPageDevicesList}
            currentPage={pageInfo.current_page}
            hasNextPage={pageInfo.has_next_page}
            canResetPerPage={false}
            //resetPerPage={this.props.resetPerPage}
          />
          <Modal isOpen={this.props.modalOpen} toggle={this.toggleModal} centered={true}>
            <ModalHeader toggle={this.toggleModal}>{gettext('Unlink device')}</ModalHeader>
            <ModalBody>
              <Form>
                <FormGroup>
                  <p>{gettext('Are you sure you want to unlink this device?')}</p>
                  <Label check>
                    <Input style={{'marginLeft':'0'}} type="checkbox" onChange={this.checkWipeDevice}/>
                    <span className="ml-4">{'  '}{gettext('Delete files from this device the next time it comes online.')}</span>
                  </Label>
                </FormGroup>
              </Form>
            </ModalBody>
            <ModalFooter>
              <Button color="primary" onClick={this.unlinkDevice}>{gettext('Yes')}</Button>{' '}
              <Button color="secondary" onClick={this.toggleModal}>{gettext('No')}</Button>
            </ModalFooter>
          </Modal>
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
    };
  }

  handleMouseOver = () => {
    this.setState({showOpIcon: true});
  }

  handleMouseOut = () => {
    this.setState({showOpIcon: false});
  }

  showUnlinkDeviceModal = (e) => {
    e.preventDefault();
    let deviceInfo = {
      platform: this.props.item.platform,
      device_id: this.props.item.device_id,
      user: this.props.item.user
    };
    this.props.showModal(deviceInfo);
  }

  render() {
    let item = this.props.item;
    let iconVisibility = this.state.showOpIcon ? '' : ' invisible'; 
    let deleteIconClassName = 'sf2-icon-delete action-icon' + iconVisibility;
    return (
      <tr onMouseEnter={this.handleMouseOver} onMouseLeave={this.handleMouseOut}>
        <td>{item.user}</td>
        <td>{item.platform}{' / '}{item.client_version}</td>
        <td>{item.device_name}</td>
        <td>{item.last_login_ip}</td>
        <td>
          <span className="item-meta-info" title={moment(item.last_accessed).format('llll')}>{moment(item.last_accessed).fromNow()}</span>
        </td>
        <td>
          <a href="#" className={deleteIconClassName} title={gettext('Remove')} onClick={this.showUnlinkDeviceModal}></a>
        </td>
      </tr>
    );
  }
}

class DevicesByPlatform extends Component {

  constructor(props) {
    super(props);
    this.state = {
      modalOpen: false,
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

  unlinkDevice = (deviceInfo, isWipeDevice) => {
    let { platform, device_id, user } = deviceInfo;
    seafileAPI.sysAdminUnlinkDevices(platform, device_id, user, isWipeDevice).then((res) => {
      let items = this.state.devicesData.filter(eachItem => {
        return eachItem.platform !== platform || eachItem.device_id !== device_id || eachItem.user !== user;
      });
      this.setState({devicesData: items});
      this.toggleModal();
      let message = gettext("Successfully unlinked the device.");
      toaster.success(message);
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  toggleModal = () => {
    this.setState({
      modalOpen: !this.state.modalOpen
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
          modalOpen={this.state.modalOpen}
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
