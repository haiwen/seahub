import React, { Component, Fragment } from 'react';
import { Button } from 'reactstrap';
import { seafileAPI } from '../../../utils/seafile-api';
import { gettext } from '../../../utils/constants';
import toaster from '../../../components/toast';
import { Utils } from '../../../utils/utils';
import EmptyTip from '../../../components/empty-tip';
import moment from 'moment';
import Loading from '../../../components/loading';
import { Link } from '@reach/router';

class Content extends Component {

  constructor(props) {
    super(props);
    this.state = {
      currentDeviceInfo: {},
    };
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
          <h2>{gettext('No sync errors')}</h2>
        </EmptyTip>
      );
      const table = (
        <Fragment>
          <table className="table-hover">
            <thead>
              <tr>
                <th width="16%">{gettext('User')}</th>
                <th width="20%">{gettext('Device')}{' / '}{gettext('Version')}</th>
                <th width="16%">{gettext('IP')}</th>
                <th width="16%">{gettext('Library')}</th>
                <th width="16%">{gettext('Error')}</th>
                <th width="16%">{gettext('Time')}</th>
              </tr>
            </thead>
            {items.length && 
              <tbody>
                {items.map((item, index) => {
                  return (<Item key={index} item={item} showModal={this.showModal}/>);
                })}
              </tbody>
            }
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
      showOpIcon: false,
    };
  }

  handleMouseOver = () => {
    this.setState({showOpIcon: true});
  }

  handleMouseOut = () => {
    this.setState({showOpIcon: false});
  }

  render() {
    let item = this.props.item;
    return (
      <tr onMouseEnter={this.handleMouseOver} onMouseLeave={this.handleMouseOut}>
        <td><Link to={'/useradmin/info/' + item.email}>{item.name}</Link></td>
        <td>{item.device_name}{' / '}{item.client_version}</td>
        <td>{item.device_ip}</td>
        <td><Link to={'/sysadmin/#libs/' + item.repo_id}>{item.repo_name}</Link></td>
        <td>{item.error_msg}</td>
        <td>
          <span className="item-meta-info" title={moment(item.last_accessed).format('llll')}>{moment(item.error_time).fromNow()}</span>
        </td>
      </tr>
    );
  }
}

class DevicesErrors extends Component {

  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: '',
      devicesErrors: []
    };
  }

  componentDidMount () {
    seafileAPI.sysAdminListDevicesErrors().then((res) => {
      this.setState({
        devicesErrors: res.data,
        loading: false
      }, () => {
        if (this.state.devicesErrors.length > 0) {
          this.props.handleErrorsCleanBtnShow(true);
        } else {
          this.props.handleErrorsCleanBtnShow(false);
        }
      });
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });

  }

  render() {
    return (
      <Fragment>
        <div className="cur-view-content">
          <Content
            unlinkDevice={this.unlinkDevice}
            loading={this.state.loading}
            errorMsg={this.state.errorMsg}
            items={this.state.devicesErrors}
          />
        </div>
      </Fragment>
    );
  }
}

export default DevicesErrors;
