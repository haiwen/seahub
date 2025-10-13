import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { Button } from 'reactstrap';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { Link } from '@gatsbyjs/reach-router';
import { orgAdminAPI } from '../../../utils/org-admin-api';
import { siteRoot, gettext, orgID } from '../../../utils/constants';
import toaster from '../../../components/toast';
import { Utils } from '../../../utils/utils';
import EmptyTip from '../../../components/empty-tip';
import Loading from '../../../components/loading';
import DevicesNav from './devices-nav';
import MainPanelTopbar from '../main-panel-topbar';
import UserLink from '../user-link';
import Paginator from '../../../components/paginator';
import { formatWithTimezone } from '../../../utils/time';


dayjs.extend(relativeTime);

class Content extends Component {

  constructor(props) {
    super(props);
  }

  getPreviousPageDeviceErrorsList = () => {
    this.props.getDeviceErrorsListByPage(this.props.pageInfo.current_page - 1);
  };

  getNextPageDeviceErrorsList = () => {
    this.props.getDeviceErrorsListByPage(this.props.pageInfo.current_page + 1);
  };

  render() {
    const { loading, errorMsg, items, pageInfo, curPerPage } = this.props;
    if (loading) {
      return <Loading />;
    } else if (errorMsg) {
      return <p className="error text-center">{errorMsg}</p>;
    } else {
      const emptyTip = (
        <EmptyTip text={gettext('No sync errors')}/>
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

Content.propTypes = {
  loading: PropTypes.bool.isRequired,
  errorMsg: PropTypes.string.isRequired,
  items: PropTypes.array.isRequired,
  getDeviceErrorsListByPage: PropTypes.func.isRequired,
  resetPerPage: PropTypes.func.isRequired,
  curPerPage: PropTypes.number.isRequired,
  pageInfo: PropTypes.object,
};

class Item extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isOpIconShown: false,
    };
  }

  handleMouseOver = () => {
    this.setState({ isOpIconShown: true });
  };

  handleMouseOut = () => {
    this.setState({ isOpIconShown: false });
  };

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
          <span className="item-meta-info" title={formatWithTimezone(item.error_time)}>{dayjs(item.error_time).fromNow()}</span>
        </td>
      </tr>
    );
  }
}

Item.propTypes = {
  item: PropTypes.object.isRequired,
};

class OrgDevicesErrors extends Component {

  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: '',
      devicesErrors: [],
      isCleanBtnShown: false,
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
      this.getDeviceErrorsListByPage(this.state.currentPage);
    });
  }

  getDeviceErrorsListByPage = (page) => {
    let per_page = this.state.perPage;
    orgAdminAPI.orgAdminListDevicesErrors(orgID, page, per_page).then((res) => {
      this.setState({
        loading: false,
        devicesErrors: res.data.device_errors,
        pageInfo: res.data.page_info,
        isCleanBtnShown: res.data.device_errors.length > 0
      });
    }).catch((error) => {
      this.setState({
        loading: false,
        errorMsg: Utils.getErrorMsg(error, true) // true: show login tip if 403
      });
    });
  };

  clean = () => {
    orgAdminAPI.orgAdminClearDeviceErrors(orgID).then((res) => {
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
  };

  resetPerPage = (perPage) => {
    this.setState({
      perPage: perPage
    }, () => {
      this.getDeviceErrorsListByPage(1);
    });
  };
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
