import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { systemAdminAPI } from '../../../utils/system-admin-api';
import { gettext } from '../../../utils/constants';
import { Utils } from '../../../utils/utils';
import EmptyTip from '../../../components/empty-tip';
import Loading from '../../../components/loading';
import Paginator from '../../../components/paginator';
import UserLink from '../user-link';
import LogUserSelector from '../../dashboard/log-user-selector';

dayjs.extend(relativeTime);

class Content extends Component {

  getPreviousPage = () => {
    this.props.getLogsByPage(this.props.currentPage - 1);
  };

  getNextPage = () => {
    this.props.getLogsByPage(this.props.currentPage + 1);
  };

  render() {
    const { loading, errorMsg, items, perPage, currentPage, hasNextPage } = this.props;
    if (loading) {
      return <Loading />;
    } else if (errorMsg) {
      return <p className="error text-center">{errorMsg}</p>;
    } else {
      const emptyTip = (
        <EmptyTip text={gettext('No login logs')}>
        </EmptyTip>
      );
      const table = (
        <Fragment>
          <table className="table-hover">
            <thead>
              <tr>
                <th width="25%">{gettext('Name')}</th>
                <th width="25%">{gettext('IP')}</th>
                <th width="25%">{gettext('Status')}</th>
                <th width="25%">{gettext('Time')}</th>
              </tr>
            </thead>
            {items &&
              <tbody>
                {items.map((item, index) => {
                  return (<Item
                    key={index}
                    item={item}
                  />);
                })}
              </tbody>
            }
          </table>
          <Paginator
            gotoPreviousPage={this.getPreviousPage}
            gotoNextPage={this.getNextPage}
            currentPage={currentPage}
            hasNextPage={hasNextPage}
            curPerPage={perPage}
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
};


class Item extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isOpIconShown: false,
    };
  }

  handleMouseOver = () => {
    this.setState({
      isOpIconShown: true
    });
  };

  handleMouseOut = () => {
    this.setState({
      isOpIconShown: false
    });
  };

  render() {
    let { item } = this.props;
    return (
      <tr onMouseOver={this.handleMouseOver} onMouseOut={this.handleMouseOut}>
        <td><UserLink email={item.email} name={item.name} /></td>
        <td>{item.login_ip}</td>
        <td>{item.log_success ? gettext('Success') : gettext('Failed')}</td>
        <td>{dayjs(item.login_time).fromNow()}</td>
      </tr>
    );
  }
}

Item.propTypes = {
  item: PropTypes.object.isRequired,
};

class LoginLogs extends Component {

  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: '',
      logList: [],
      perPage: 100,
      currentPage: 1,
      hasNextPage: false,
      isExportExcelDialogOpen: false,
      availableUsers: [],
      selectedUsers: [],
      isUserSelectorOpen: false,
    };
    this.initPage = 1;
  }

  componentDidMount() {
    let urlParams = (new URL(window.location)).searchParams;
    const { currentPage, perPage } = this.state;
    this.setState({
      perPage: parseInt(urlParams.get('per_page') || perPage),
      currentPage: parseInt(urlParams.get('page') || currentPage)
    }, () => {
      this.getLogsByPage(this.state.currentPage);
    });
  }

  getLogsByPage = (page) => {
    let { perPage, selectedUsers } = this.state;
    let emails = selectedUsers.map(user => user.email);

    systemAdminAPI.sysAdminListLoginLogs(page, perPage, { 'email': emails }).then((res) => {
      this.setState({
        logList: res.data.login_log_list,
        loading: false,
        currentPage: page,
        hasNextPage: Utils.hasNextPage(page, perPage, res.data.total_count),
      });
    }).catch((error) => {
      this.setState({
        loading: false,
        errorMsg: Utils.getErrorMsg(error, true) // true: show login tip if 403
      });
    });
  };

  resetPerPage = (newPerPage) => {
    this.setState({
      perPage: newPerPage,
    }, () => this.getLogsByPage(this.initPage));
  };

  handleUserFilter = (user) => {
    const { selectedUsers } = this.state;
    let newSelectedUsers;

    if (user === null) {
      newSelectedUsers = selectedUsers;
    } else {
      const isSelected = selectedUsers.find(item => item.email === user.email);
      if (isSelected) {
        newSelectedUsers = selectedUsers.filter(item => item.email !== user.email);
      } else {
        newSelectedUsers = [...selectedUsers, user];
      }
    }

    this.setState({
      selectedUsers: newSelectedUsers,
      currentPage: 1
    });
  };

  toggleUserSelector = () => {
    const { isUserSelectorOpen } = this.state;
    this.setState({
      isUserSelectorOpen: !isUserSelectorOpen
    }, () => {
      if (!this.state.isUserSelectorOpen) {
        this.getLogsByPage(1);
      }
    });
  };

  searchUsers = (value) => {
    return systemAdminAPI.sysAdminSearchUsers(value);
  };

  render() {
    let { logList, currentPage, perPage, hasNextPage, availableUsers, selectedUsers } = this.state;
    return (
      <div className="main-panel-center flex-row">
        <div className="cur-view-container">
          <div className="cur-view-content">
            <LogUserSelector
              componentName={gettext('Users')}
              items={availableUsers}
              selectedItems={selectedUsers}
              onSelect={this.handleUserFilter}
              isOpen={this.state.isUserSelectorOpen}
              onToggle={this.toggleUserSelector}
              searchUsersFunc={this.searchUsers}
            />
            <Content
              loading={this.state.loading}
              errorMsg={this.state.errorMsg}
              items={logList}
              currentPage={currentPage}
              perPage={perPage}
              hasNextPage={hasNextPage}
              getLogsByPage={this.getLogsByPage}
              resetPerPage={this.resetPerPage}
            />
          </div>
        </div>
      </div>
    );
  }
}

export default LoginLogs;
