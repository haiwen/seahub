import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { Link } from '@gatsbyjs/reach-router';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { gettext, siteRoot } from '../../../utils/constants';
import { Utils } from '../../../utils/utils';
import { systemAdminAPI } from '../../../utils/system-admin-api';
import EmptyTip from '../../../components/empty-tip';
import Loading from '../../../components/loading';
import Paginator from '../../../components/paginator';
import MainPanelTopbar from '../main-panel-topbar';
import UserLink from '../user-link';
import LogsNav from './logs-nav';
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
        <EmptyTip text={gettext('No group invite logs')}>
        </EmptyTip>
      );
      const table = (
        <Fragment>
          <table className="table-hover">
            <thead>
              <tr>
                <th width="20%">{gettext('User')}</th>
                <th width="20%">{gettext('Group')}</th>
                <th width="20%">{gettext('Operator')}</th>
                <th width="25%">{gettext('Action')}</th>
                <th width="15%">{gettext('Date')}</th>
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

  getGroupName = (item) => {
    if (item.group_name) {
      return <Link to={`${siteRoot}sys/groups/${item.group_id}/libraries/`}>{item.group_name}</Link>;
    } else {
      return gettext('Deleted');
    }
  };

  getActionTextByEType = (operation) => {
    if (operation.indexOf('group_member_add') != -1) {
      return gettext('Add member');
    } else if (operation.indexOf('group_member_delete') != -1) {
      return gettext('Delete member');
    } else {
      return '';
    }
  };

  render() {
    let { item } = this.props;
    return (
      <tr onMouseOver={this.handleMouseOver} onMouseOut={this.handleMouseOut}>
        <td>{<UserLink email={item.user_email} name={item.user_name} />}</td>
        <td>{this.getGroupName(item)}</td>
        <td>{<UserLink email={item.operator_email} name={item.operator_name} />}</td>
        <td>{this.getActionTextByEType(item.operation)}</td>
        <td>{dayjs(item.date).fromNow()}</td>
      </tr>
    );
  }
}

Item.propTypes = {
  item: PropTypes.object.isRequired,
};

class GroupMemberAuditLogs extends Component {

  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: '',
      logList: [],
      perPage: 100,
      currentPage: 1,
      hasNextPage: false,
      availableUsers: [],
      selectedUsers: [],
      selectedOperators: [],
      selectedGroups: [],
      openSelector: null,
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
    let { perPage, selectedUsers, selectedOperators, selectedGroups } = this.state;

    const emails = {
      'user_email': selectedUsers.map(user => user.email),
      'operator_email': selectedOperators.map(user => user.email),
      'group_id': selectedGroups.map(group => group.id)
    };

    systemAdminAPI.sysAdminListGroupInviteLogs(page, perPage, emails).then((res) => {
      this.setState({
        logList: res.data.group_invite_log_list,
        loading: false,
        currentPage: page,
        hasNextPage: res.data.has_next_page,
      });
    }).catch((error) => {
      this.setState({
        loading: false,
        errorMsg: Utils.getErrorMsg(error, true)
      });
    });
  };

  handleUserFilter = (user, shouldFetchData = true) => {
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
    }, () => {
      if (shouldFetchData) {
        this.getLogsByPage(1);
      }
    });
  };

  handleOperatorFilter = (user, shouldFetchData = true) => {
    const { selectedOperators } = this.state;
    let newSelectedUsers;

    if (user === null) {
      newSelectedUsers = selectedOperators;
    } else {
      const isSelected = selectedOperators.find(item => item.email === user.email);
      if (isSelected) {
        newSelectedUsers = selectedOperators.filter(item => item.email !== user.email);
      } else {
        newSelectedUsers = [...selectedOperators, user];
      }
    }

    this.setState({
      selectedOperators: newSelectedUsers,
      currentPage: 1
    }, () => {
      if (shouldFetchData) {
        this.getLogsByPage(1);
      }
    });
  };

  handleGroupFilter = (group, shouldFetchData = true) => {
    const { selectedGroups } = this.state;
    let newSelectedGroups;

    if (group === null) {
      newSelectedGroups = selectedGroups;
    } else {
      const isSelected = selectedGroups.find(item => item.id === group.id);
      if (isSelected) {
        newSelectedGroups = selectedGroups.filter(item => item.id !== group.id);
      } else {
        newSelectedGroups = [...selectedGroups, group];
      }
    }

    this.setState({
      selectedGroups: newSelectedGroups,
      currentPage: 1
    }, () => {
      if (shouldFetchData) {
        this.getLogsByPage(1);
      }
    });
  };

  handleSelectorToggle = (selectorType) => {
    const { openSelector } = this.state;
    const wasOpen = openSelector === selectorType;

    this.setState({
      openSelector: wasOpen ? null : selectorType
    }, () => {
      if (wasOpen) {
        this.getLogsByPage(1);
      }
    });
  };

  searchUsers = (value) => {
    return systemAdminAPI.sysAdminSearchUsers(value);
  };

  searchGroups = (value) => {
    return systemAdminAPI.sysAdminSearchGroups(value);
  };

  resetPerPage = (newPerPage) => {
    this.setState({
      perPage: newPerPage,
    }, () => this.getLogsByPage(this.initPage));
  };

  render() {
    let {
      logList, currentPage, perPage, hasNextPage,
      availableUsers, selectedUsers, selectedOperators, selectedGroups,
      openSelector
    } = this.state;

    return (
      <Fragment>
        <MainPanelTopbar {...this.props} />
        <div className="main-panel-center flex-row">
          <div className="cur-view-container">
            <LogsNav currentItem="groupMember" />
            <div className="cur-view-content">
              <Fragment>
                <div className="d-flex align-items-center mb-2">
                  <LogUserSelector
                    componentName="Member"
                    items={availableUsers}
                    selectedItems={selectedUsers}
                    onSelect={this.handleUserFilter}
                    isOpen={openSelector === 'user'}
                    onToggle={() => this.handleSelectorToggle('user')}
                    searchUsersFunc={this.searchUsers}
                  />
                  <LogUserSelector
                    componentName="Group"
                    items={availableUsers}
                    selectedItems={selectedGroups}
                    onSelect={this.handleGroupFilter}
                    isOpen={openSelector === 'group'}
                    onToggle={() => this.handleSelectorToggle('group')}
                    searchGroupsFunc={this.searchGroups}
                  />
                  <LogUserSelector
                    componentName="Operator"
                    items={availableUsers}
                    selectedItems={selectedOperators}
                    onSelect={this.handleOperatorFilter}
                    isOpen={openSelector === 'operator'}
                    onToggle={() => this.handleSelectorToggle('operator')}
                    searchUsersFunc={this.searchUsers}
                  />
                </div>
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
              </Fragment>
            </div>
          </div>
        </div>
      </Fragment>
    );
  }
}

export default GroupMemberAuditLogs;
