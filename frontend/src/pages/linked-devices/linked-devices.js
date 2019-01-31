import React, { Component } from 'react';
import moment from 'moment';
import { seafileAPI } from '../../utils/seafile-api';
import { gettext, loginUrl } from '../../utils/constants';
import toaster from '../../components/toast';

class Content extends Component {

  render() {
    const {loading, errorMsg, items} = this.props.data;

    if (loading) {
      return <span className="loading-icon loading-tip"></span>;
    } else if (errorMsg) {
      return <p className="error text-center">{errorMsg}</p>;
    } else {
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
            <th width="25%">{gettext('Platform')}</th>
            <th width="70%">{gettext('Device Name')}</th>
            <th width="5%"></th>
          </tr>
        </thead>
      );

      return (
        <table>
          {window.innerWidth >= 768 ? desktopThead : mobileThead}
          <TableBody items={items} />
        </table>
      );
    }
  }
}

class TableBody extends Component {

  constructor(props) {
    super(props);
    this.state = {
      items: this.props.items
    };
  }

  render() {

    let listLinkedDevices = this.state.items.map(function(item, index) {
      return <Item key={index} data={item} />;
    }, this);

    return (
      <tbody>{listLinkedDevices}</tbody>
    );
  }
}

class Item extends Component {

  constructor(props) {
    super(props);
    this.state = {
      showOpIcon: false,
      unlinked: false
    };

    this.handleMouseOver = this.handleMouseOver.bind(this);
    this.handleMouseOut = this.handleMouseOut.bind(this);
    this.handleClick = this.handleClick.bind(this);
  }

  handleMouseOver() {
    this.setState({
      showOpIcon: true
    });
  }

  handleMouseOut() {
    this.setState({
      showOpIcon: false
    });
  }

  handleClick(e) {
    e.preventDefault();

    const data = this.props.data;

    seafileAPI.unlinkDevice(data.platform, data.device_id).then((res) => {
      this.setState({
        unlinked: true
      });
      let msg_s = gettext('Successfully unlink %(name)s.');
      msg_s = msg_s.replace('%(name)s', data.device_name);
      toaster.success(msg_s);
    }).catch((error) => {
      let message = gettext('Failed to unlink %(name)s');
      message = message.replace('%(name)s', data.device_name);
      toaster.danger(message);
    });
  }

  render() {
    if (this.state.unlinked) {
      return null;
    }

    const data = this.props.data;

    let opClasses = 'sf2-icon-delete unlink-device action-icon';
    opClasses += this.state.showOpIcon ? '' : ' invisible';

    const desktopItem = (
      <tr onMouseOver={this.handleMouseOver} onMouseOut={this.handleMouseOut}>
        <td>{data.platform}</td>
        <td>{data.device_name}</td>
        <td>{data.last_login_ip}</td>
        <td>{moment(data.last_accessed).fromNow()}</td>
        <td>
          <a href="#" className={opClasses} title={gettext('Unlink')} aria-label={gettext('Unlink')} onClick={this.handleClick}></a>
        </td>
      </tr>
    );

    const mobileItem = (
      <tr>
        <td>{data.platform}</td>
        <td>{data.device_name}</td>
        <td>
          <a href="#" className={opClasses} title={gettext('Unlink')} aria-label={gettext('Unlink')} onClick={this.handleClick}></a>
        </td>
      </tr>
    );

    if (window.innerWidth >= 768) {
      return desktopItem;
    } else {
      return mobileItem;
    }
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
      //res: {data: Array(2), status: 200, statusText: "OK", headers: {…}, config: {…}, …}
      this.setState({
        loading: false,
        items: res.data
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
