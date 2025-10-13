import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { systemAdminAPI } from '../../../utils/system-admin-api';
import { siteRoot, gettext } from '../../../utils/constants';
import { Utils } from '../../../utils/utils';
import EmptyTip from '../../../components/empty-tip';
import Loading from '../../../components/loading';
import { Link } from '@gatsbyjs/reach-router';
import UserLink from '../user-link';
import Paginator from '../../../components/paginator';
import { eventBus } from '../../../components/common/event-bus';
import { EVENT_BUS_TYPE } from '../../../components/common/event-bus-type';
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
        <EmptyTip text={gettext('No sync errors')}>
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
  getDeviceErrorsListByPage: PropTypes.func,
  curPerPage: PropTypes.number,
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
          <span className="item-meta-info" title={formatWithTimezone(item.last_accessed)}>{dayjs(item.error_time).fromNow()}</span>
        </td>
      </tr>
    );
  }
}

Item.propTypes = {
  item: PropTypes.object.isRequired,
};

class DeviceErrors extends Component {

  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: '',
      pageInfo: {},
      perPage: 100,
      deviceErrors: [],
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

    this.unsubscribeClearDeviceErrors = eventBus.subscribe(EVENT_BUS_TYPE.CLEAR_DEVICE_ERRORS, () => this.setState({ deviceErrors: [] }));
  }

  componentWillUnmount() {
    this.unsubscribeClearDeviceErrors();
  }

  getDeviceErrorsListByPage = (page) => {
    let per_page = this.state.perPage;
    systemAdminAPI.sysAdminListDeviceErrors(page, per_page).then((res) => {
      this.setState({
        loading: false,
        pageInfo: res.data.page_info,
      });
      if (res.data.device_errors.length > 0) {
        eventBus.dispatch(EVENT_BUS_TYPE.SHOW_CLEAN_BTN);
      }
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
      this.getDeviceErrorsListByPage(1);
    });
  };
  render() {
    return (
      <div className="main-panel-center flex-row">
        <div className="cur-view-container">
          <div className="cur-view-content">
            <Content
              loading={this.state.loading}
              errorMsg={this.state.errorMsg}
              items={this.state.deviceErrors}
              getDeviceErrorsListByPage={this.getDeviceErrorsListByPage}
              curPerPage={this.state.perPage}
              resetPerPage={this.resetPerPage}
              pageInfo={this.state.pageInfo}
            />
          </div>
        </div>
      </div>
    );
  }
}

export default DeviceErrors;
