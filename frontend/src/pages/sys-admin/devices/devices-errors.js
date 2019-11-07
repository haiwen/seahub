import React, { Component, Fragment } from 'react';
import { Button } from 'reactstrap';
import { seafileAPI } from '../../../utils/seafile-api';
import { siteRoot, loginUrl, gettext } from '../../../utils/constants';
import toaster from '../../../components/toast';
import { Utils } from '../../../utils/utils';
import EmptyTip from '../../../components/empty-tip';
import moment from 'moment';
import Loading from '../../../components/loading';
import { Link } from '@reach/router';
import DevicesNav from './devices-nav';
import MainPanelTopbar from '../main-panel-topbar';
import UserLink from '../user-link';

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
            <tbody>
              {items.map((item, index) => {
                return (<Item key={index} item={item} />);
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
    };
  }

  handleMouseOver = () => {
    this.setState({isOpIconShown: true});
  }

  handleMouseOut = () => {
    this.setState({isOpIconShown: false});
  }

  render() {
    let item = this.props.item;
    return (
      <tr onMouseEnter={this.handleMouseOver} onMouseLeave={this.handleMouseOut}>
        <td><UserLink email={item.email} name={item.name} /></td>
        <td>{item.device_name}{' / '}{item.client_version}</td>
        <td>{item.device_ip}</td>
        <td><Link to={`${siteRoot}sysadmin/#libs/${item.repo_id}`}>{item.repo_name}</Link></td>
        <td>{item.error_msg}</td>
        <td>
          <span className="item-meta-info" title={moment(item.last_accessed).format('llll')}>{moment(item.error_time).fromNow()}</span>
        </td>
      </tr>
    );
  }
}

class DeviceErrors extends Component {

  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: '',
      devicesErrors: [],
      isCleanBtnShown: false
    };
  }

  componentDidMount () {
    seafileAPI.sysAdminListDeviceErrors().then((res) => {
      this.setState({
        loading: false,
        devicesErrors: res.data,
        isCleanBtnShown: res.data.length > 0
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

  clean = () => {
    seafileAPI.sysAdminClearDeviceErrors().then((res) => {
      this.setState({
        devicesErrors: [],
        isCleanBtnShown: false
      });
      let message = gettext('Successfully cleaned all errors.');
      toaster.success(message);
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  render() {
    return (
      <Fragment>
        {this.state.isCleanBtnShown ? (
          <MainPanelTopbar>
            <Button className="operation-item" onClick={this.clean}>{gettext('Clean')}</Button>
          </MainPanelTopbar>
        ) : (
          <MainPanelTopbar />
        )}
        <div className="main-panel-center flex-row">
          <div className="cur-view-container">
            <DevicesNav currentItem="errors" />
            <div className="cur-view-content">
              <Content
                loading={this.state.loading}
                errorMsg={this.state.errorMsg}
                items={this.state.devicesErrors}
              />
            </div>
          </div>
        </div>
      </Fragment>
    );
  }
}

export default DeviceErrors;
