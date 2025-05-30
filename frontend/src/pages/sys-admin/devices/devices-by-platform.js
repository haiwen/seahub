import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import classnames from 'classnames';
import { systemAdminAPI } from '../../../utils/system-admin-api';
import { gettext } from '../../../utils/constants';
import toaster from '../../../components/toast';
import { Utils } from '../../../utils/utils';
import EmptyTip from '../../../components/empty-tip';
import Loading from '../../../components/loading';
import Paginator from '../../../components/paginator';
import SysAdminUnlinkDevice from '../../../components/dialog/sysadmin-dialog/sysadmin-unlink-device-dialog';

dayjs.extend(relativeTime);

class Content extends Component {

  constructor(props) {
    super(props);
  }

  getPreviousPageDevicesList = () => {
    this.props.getDevicesListByPage(this.props.pageInfo.current_page - 1);
  };

  getNextPageDevicesList = () => {
    this.props.getDevicesListByPage(this.props.pageInfo.current_page + 1);
  };

  render() {
    const { loading, errorMsg, items, pageInfo, curPerPage } = this.props;
    if (loading) {
      return <Loading />;
    } else if (errorMsg) {
      return <p className="error text-center">{errorMsg}</p>;
    } else {
      const emptyTip = (
        <EmptyTip text={gettext('No connected devices')}>
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
                <th width="5%">{/* Operations*/}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                return (<Item key={index} item={item} />);
              })}
            </tbody>
          </table>
          <Paginator
            gotoPreviousPage={this.getPreviousPageDevicesList}
            gotoNextPage={this.getNextPageDevicesList}
            currentPage={pageInfo.current_page}
            hasNextPage={pageInfo.has_next_page}
            curPerPage={curPerPage}
            resetPerPage={this.props.resetPerPage}
          />
        </Fragment>
      );

      return items.length ? table : emptyTip;
    }
  }
}

Content.propTypes = {
  loading: PropTypes.bool.isRequired,
  errorMsg: PropTypes.string.isRequired,
  items: PropTypes.array.isRequired,
  getLogsByPage: PropTypes.func,
  resetPerPage: PropTypes.func,
  currentPage: PropTypes.number,
  perPage: PropTypes.number,
  pageInfo: PropTypes.object,
  hasNextPage: PropTypes.bool,
  getDevicesListByPage: PropTypes.func.isRequired,
  curPerPage: PropTypes.number,
};

class Item extends Component {

  constructor(props) {
    super(props);
    this.state = {
      unlinked: false,
      isHighlighted: false,
      isOpIconShown: false,
      isUnlinkDeviceDialogOpen: false
    };
  }

  handleMouseOver = () => {
    this.setState({
      isHighlighted: true,
      isOpIconShown: true
    });
  };

  handleMouseOut = () => {
    this.setState({
      isHighlighted: false,
      isOpIconShown: false
    });
  };

  handleUnlink = () => {
    if (this.props.item.is_desktop_client) {
      this.toggleUnlinkDeviceDialog();
    } else {
      this.unlinkDevice(true);
    }
  };

  toggleUnlinkDeviceDialog = () => {
    this.setState({ isUnlinkDeviceDialogOpen: !this.state.isUnlinkDeviceDialogOpen });
  };

  unlinkDevice = (deleteFiles) => {
    const { platform, device_id, user } = this.props.item;
    systemAdminAPI.sysAdminUnlinkDevice(platform, device_id, user, deleteFiles).then((res) => {
      this.setState({ unlinked: true });
      let message = gettext('Successfully unlinked the device.');
      toaster.success(message);
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  render() {
    const item = this.props.item;
    const { unlinked, isUnlinkDeviceDialogOpen, isHighlighted, isOpIconShown } = this.state;

    if (unlinked) {
      return null;
    }

    return (
      <Fragment>
        <tr
          className={classnames({
            'tr-highlight': isHighlighted
          })}
          onMouseEnter={this.handleMouseOver}
          onMouseLeave={this.handleMouseOut}
          onFocus={this.onMouseEnter}
        >
          <td>{item.user_name}</td>
          <td>{item.platform}{' / '}{item.client_version}</td>
          <td>{item.device_name}</td>
          <td>{item.last_login_ip}</td>
          <td>
            <span title={dayjs(item.last_accessed).format('dddd, MMMM D, YYYY h:mm:ss A')}>{dayjs(item.last_accessed).fromNow()}</span>
          </td>
          <td>
            <i
              className={`sf3-font-delete1 sf3-font op-icon ${isOpIconShown ? '' : 'invisible'}`}
              title={gettext('Unlink')}
              onClick={this.handleUnlink}
            >
            </i>
          </td>
        </tr>
        {isUnlinkDeviceDialogOpen &&
          <SysAdminUnlinkDevice
            unlinkDevice={this.unlinkDevice}
            toggleDialog={this.toggleUnlinkDeviceDialog}
          />
        }
      </Fragment>
    );
  }
}

Item.propTypes = {
  item: PropTypes.object.isRequired,
};

class DevicesByPlatform extends Component {

  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: '',
      devicesData: [],
      pageInfo: {},
      perPage: 100
    };
  }

  componentDidMount() {
    let urlParams = (new URL(window.location)).searchParams;
    const { currentPage = 1, perPage } = this.state;
    this.setState({
      perPage: parseInt(urlParams.get('per_page') || perPage),
      currentPage: parseInt(urlParams.get('page') || currentPage)
    }, () => {
      this.getDevicesListByPage(this.state.currentPage);
    });
  }

  getDevicesListByPage = (page) => {
    let platform = this.props.devicesPlatform;
    let per_page = this.state.perPage;
    systemAdminAPI.sysAdminListDevices(platform, page, per_page).then((res) => {
      this.setState({
        devicesData: res.data.devices,
        pageInfo: res.data.page_info,
        loading: false
      });
    }).catch((error) => {
      this.setState({
        loading: false,
        errorMsg: Utils.getErrorMsg(error, true) // true: show login tip if 403
      });
    });
  };

  resetPerPage = (perPage) => {
    this.setState({
      perPage: perPage
    }, () => {
      this.getDevicesListByPage(1);
    });
  };

  render() {
    return (
      <div className="cur-view-content">
        <Content
          loading={this.state.loading}
          errorMsg={this.state.errorMsg}
          items={this.state.devicesData}
          getDevicesListByPage={this.getDevicesListByPage}
          curPerPage={this.state.perPage}
          resetPerPage={this.resetPerPage}
          pageInfo={this.state.pageInfo}
        />
      </div>
    );
  }
}

DevicesByPlatform.propTypes = {
  devicesPlatform: PropTypes.string.isRequired,
};

export default DevicesByPlatform;
