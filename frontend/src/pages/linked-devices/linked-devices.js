import React, { Component } from 'react';
import { Dropdown, DropdownToggle, DropdownItem } from 'reactstrap';
import moment from 'moment';
import { seafileAPI } from '../../utils/seafile-api';
import { gettext } from '../../utils/constants';
import toaster from '../../components/toast';
import EmptyTip from '../../components/empty-tip';
import ConfirmUnlinkDeviceDialog from '../../components/dialog/confirm-unlink-device';
import { Utils } from '../../utils/utils';

class Content extends Component {

  render() {
    const {loading, errorMsg, items} = this.props.data;

    if (loading) {
      return <span className="loading-icon loading-tip"></span>;
    } else if (errorMsg) {
      return <p className="error text-center">{errorMsg}</p>;
    } else {
      const emptyTip = (
        <EmptyTip>
          <h2>{gettext('No linked devices')}</h2>
          <p>{gettext('You have not accessed your files with any client (desktop or mobile) yet. Configure clients on your devices to access your data more comfortably.')}</p>
        </EmptyTip>
      );

      const desktopThead = (
        <thead>
          <tr>
            <th width="13%">{gettext('Platform')}</th>
            <th width="30%">{gettext('Device Name')}</th>
            <th width="30%">{gettext('IP')}</th>
            <th width="17%">{gettext('Last Access')}</th>
            <th width="10%"></th>
          </tr>
        </thead>
      );
      const mobileThead = (
        <thead>
          <tr>
            <th width="92%"></th>
            <th width="8%"></th>
          </tr>
        </thead>
      );

      const isDesktop = Utils.isDesktop();
      return items.length ? (
        <table className={`table-hover ${isDesktop ? '': 'table-thead-hidden'}`}>
          {isDesktop ? desktopThead : mobileThead}
          <tbody>
            {items.map((item, index) => {
              return <Item key={index} data={item} isDesktop={isDesktop} />;
            })}
          </tbody>
        </table>
      ): emptyTip;
    }
  }
}

class Item extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isOpMenuOpen: false, // for mobile
      isOpIconShown: false,
      unlinked: false,
      isConfirmUnlinkDialogOpen: false
    };
  }

  toggleOpMenu = () => {
    this.setState({
      isOpMenuOpen: !this.state.isOpMenuOpen
    });
  }

  handleMouseOver = () => {
    this.setState({
      isOpIconShown: true
    });
  }

  handleMouseOut = () => {
    this.setState({
      isOpIconShown: false
    });
  }

  toggleDialog = () => {
    this.setState({
      isConfirmUnlinkDialogOpen: !this.state.isConfirmUnlinkDialogOpen
    });
  }

  handleClick = (e) => {
    e.preventDefault();

    const data = this.props.data;
    if (data.is_desktop_client) {
      this.toggleDialog();
    } else {
      const wipeDevice = true;
      this.unlinkDevice(wipeDevice);
    }
  }

  unlinkDevice = (wipeDevice) => {
    const data = this.props.data;
    seafileAPI.unlinkDevice(data.platform, data.device_id, wipeDevice).then((res) => {
      this.setState({
        unlinked: true
      });
      let msg = gettext('Successfully unlinked %(name)s.');
      msg = msg.replace('%(name)s', data.device_name);
      toaster.success(msg);
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  render() {
    if (this.state.unlinked) {
      return null;
    }

    const data = this.props.data;

    let opClasses = 'sf2-icon-delete unlink-device action-icon';
    opClasses += this.state.isOpIconShown ? '' : ' invisible';

    const desktopItem = (
      <tr onMouseOver={this.handleMouseOver} onMouseOut={this.handleMouseOut} onFocus={this.handleMouseOver}>
        <td>{data.platform}</td>
        <td>{data.device_name}</td>
        <td>{data.last_login_ip}</td>
        <td>{moment(data.last_accessed).fromNow()}</td>
        <td>
          <a href="#" className={opClasses} title={gettext('Unlink')} role="button" aria-label={gettext('Unlink')} onClick={this.handleClick}></a>
        </td>
      </tr>
    );

    const mobileItem = (
      <tr>
        <td>
          {data.device_name}<br />
          <span className="item-meta-info">{data.last_login_ip}</span>
          <span className="item-meta-info">{moment(data.last_accessed).fromNow()}</span>
          <span className="item-meta-info">{data.platform}</span>
        </td>
        <td>
          <Dropdown isOpen={this.state.isOpMenuOpen} toggle={this.toggleOpMenu}>
            <DropdownToggle
              tag="i"
              className="sf-dropdown-toggle fa fa-ellipsis-v ml-0"
              title={gettext('More Operations')}
              data-toggle="dropdown"
              aria-expanded={this.state.isOpMenuOpen}
            />
            <div className={this.state.isOpMenuOpen ? '' : 'd-none'} onClick={this.toggleOpMenu}>
              <div className="mobile-operation-menu-bg-layer"></div>
              <div className="mobile-operation-menu">
                <DropdownItem className="mobile-menu-item" onClick={this.handleClick}>{gettext('Unlink')}</DropdownItem>
              </div>
            </div>
          </Dropdown>
        </td>
      </tr>
    );

    return (
      <React.Fragment>
        {this.props.isDesktop ? desktopItem : mobileItem}
        {this.state.isConfirmUnlinkDialogOpen &&
        <ConfirmUnlinkDeviceDialog
          executeOperation={this.unlinkDevice}
          toggleDialog={this.toggleDialog}
        />
        }
      </React.Fragment>
    );
  }
}

class LinkedDevices extends Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: '',
      items: []
    };
  }

  componentDidMount() {
    seafileAPI.listLinkedDevices().then((res) => {
      this.setState({
        loading: false,
        items: res.data
      });
    }).catch((error) => {
      this.setState({
        loading: false,
        errorMsg: Utils.getErrorMsg(error, true) // true: show login tip if 403
      });
    });
  }

  render() {
    return (
      <div className="main-panel-center">
        <div className="cur-view-container" id="linked-devices">
          <div className="cur-view-path">
            <h3 className="sf-heading">{gettext('Linked Devices')}</h3>
          </div>
          <div className="cur-view-content">
            <Content data={this.state} />
          </div>
        </div>
      </div>
    );
  }
}

export default LinkedDevices;
