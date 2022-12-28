import React, { Component, Fragment } from 'react';
import { Button } from 'reactstrap';
import { seafileAPI } from '../../../utils/seafile-api';
import { siteRoot, gettext, orgID } from '../../../utils/constants';
import toaster from '../../../components/toast';
import { Utils } from '../../../utils/utils';
import EmptyTip from '../../../components/empty-tip';
import moment from 'moment';
import Loading from '../../../components/loading';
import { Link } from '@gatsbyjs/reach-router';
import DevicesNav from './devices-nav';
import MainPanelTopbar from '../main-panel-topbar';
import UserLink from '../user-link';
import Paginator from '../../../components/paginator';

class Content extends Component {

  constructor(props) {
    super(props);
  }

  getPreviousPageDeviceErrorsList = () => {
    this.props.getDeviceErrorsListByPage(this.props.pageInfo.current_page - 1);
  }

  getNextPageDeviceErrorsList = () => {
    this.props.getDeviceErrorsListByPage(this.props.pageInfo.current_page + 1);
  }

  render() {
    const { loading, errorMsg, items, pageInfo, curPerPage } = this.props;
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
          <Paginator
            gotoPreviousPage={this.getPreviousPageDeviceErrorsList}
            gotoNextPage={this.getNextPageDeviceErrorsList}
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

class OrgDevicesErrors extends Component {

  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: '',
      devicesErrors: [],
      isCleanBtnShown: false,
      pageInfo: {},
      perPage: 25
    };
  }

  componentDidMount () {
    let urlParams = (new URL(window.location)).searchParams;
    const { currentPage = 1, perPage } = this.state;
    this.setState({
      perPage: parseInt(urlParams.get('per_page') || perPage),
      currentPage: parseInt(urlParams.get('page') || currentPage)
    }, () => {
      this.getDeviceErrorsListByPage(this.state.currentPage);
    });
  }

  getDeviceErrorsListByPage = (page) => {
    let per_page = this.state.perPage;
    seafileAPI.orgAdminListDevicesErrors(orgID, page, per_page).then((res) => {
      this.setState({
        loading: false,
        devicesErrors: res.data.device_errors,
        pageInfo: res.data.page_info,
        isCleanBtnShown: res.data.length > 0
      });
    }).catch((error) => {
      this.setState({
        loading: false,
        errorMsg: Utils.getErrorMsg(error, true) // true: show login tip if 403
      });
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

  resetPerPage = (perPage) => {
    this.setState({
      perPage: perPage
    }, () => {
      this.getDeviceErrorsListByPage(1);
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
                getDeviceErrorsListByPage={this.getDeviceErrorsListByPage}
                curPerPage={this.state.perPage}
                resetPerPage={this.resetPerPage}
                pageInfo={this.state.pageInfo}
              />
            </div>
          </div>
        </div>
      </Fragment>
    );
  }
}

export default OrgDevicesErrors;
