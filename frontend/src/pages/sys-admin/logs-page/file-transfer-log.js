import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { Link } from '@gatsbyjs/reach-router';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { systemAdminAPI } from '../../../utils/system-admin-api';
import { gettext, siteRoot } from '../../../utils/constants';
import { Utils } from '../../../utils/utils';
import EmptyTip from '../../../components/empty-tip';
import Loading from '../../../components/loading';
import Paginator from '../../../components/paginator';
import UserLink from '../user-link';
import LogUserSelector from '../../dashboard/log-user-selector';
import LogRepoSelector from '../../dashboard/log-repo-selector';

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
        <EmptyTip text={gettext('No transfer logs')}>
        </EmptyTip>
      );
      const table = (
        <Fragment>
          <table className="table-hover">
            <thead>
              <tr>
                <th width="20%">{gettext('Transfer From')}</th>
                <th width="20%">{gettext('Transfer To')}</th>
                <th width="20%">{gettext('Operator')}</th>
                <th width="25%">{gettext('Library')}</th>
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

  getTransferTo = (item) => {
    switch (item.to_type) {
      case 'user':
        return <UserLink email={item.to_user_email} name={item.to_user_name} />;
      case 'group':
        return <Link to={`${siteRoot}sys/groups/${item.to_group_id}/libraries/`}>{item.to_group_name}</Link>;
      default:
        return gettext('Deleted');
    }
  };

  getTransferFrom = (item) => {
    switch (item.from_type) {
      case 'user':
        return <UserLink email={item.from_user_email} name={item.from_user_name} />;
      case 'group':
        return <Link to={`${siteRoot}sys/groups/${item.from_group_id}/libraries/`}>{item.from_group_name}</Link>;
      default:
        return gettext('Deleted');
    }
  };

  getOperator = (item) => {
    return <UserLink email={item.operator_email} name={item.operator_name} />;
  };

  render() {
    let { item } = this.props;
    return (
      <tr onMouseOver={this.handleMouseOver} onMouseOut={this.handleMouseOut}>
        <td>{this.getTransferFrom(item)}</td>
        <td>{this.getTransferTo(item)}</td>
        <td>{this.getOperator(item)}</td>
        <td>{item.repo_name ? item.repo_name : gettext('Deleted')}</td>
        <td>{dayjs(item.date).fromNow()}</td>
      </tr>
    );
  }
}

Item.propTypes = {
  item: PropTypes.object.isRequired,
};

class FIleTransferLogs extends Component {

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
      selectedFromUsers: [],
      selectedToUsers: [],
      selectedToGroups: [],
      selectedOperators: [],
      openSelector: null,
      availableRepos: [],
      selectedRepos: [],
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
    let {
      perPage,
      selectedFromUsers,
      selectedToUsers,
      selectedToGroups,
      selectedOperators,
      selectedRepos
    } = this.state;

    const options = {
      'from_email': selectedFromUsers.filter(item => item.email).map(user => user.email),
      'from_group': selectedFromUsers.filter(item => !item.email).map(group => group.id),
      'to_email': selectedToUsers.map(user => user.email),
      'to_group': selectedToGroups.map(group => group.to_group_id || group.id),
      'operator_email': selectedOperators.map(user => user.email),
      'repo': selectedRepos.map(repo => repo.id)
    };
    systemAdminAPI.sysAdminListFileTransferLogs(
      page,
      perPage,
      options
    ).then((res) => {
      this.setState({
        logList: res.data.repo_transfer_log_list,
        loading: false,
        currentPage: page,
        hasNextPage: res.data.has_next_page,
      });
    }).catch((error) => {
      this.setState({
        loading: false,
        currentPage: page,
        errorMsg: Utils.getErrorMsg(error, true)
      });
    });
  };

  resetPerPage = (newPerPage) => {
    this.setState({
      perPage: newPerPage,
    }, () => this.getLogsByPage(this.initPage));
  };

  handleFromUserFilter = (item, shouldFetchData = true) => {
    const { selectedFromUsers } = this.state;
    let newSelectedUsers;

    if (item === null) {
      newSelectedUsers = selectedFromUsers;
    } else {
      if (item.email) {
        const isSelected = selectedFromUsers.find(user => user.email === item.email);
        if (isSelected) {
          newSelectedUsers = selectedFromUsers.filter(user => user.email !== item.email);
        } else {
          newSelectedUsers = [...selectedFromUsers, item];
        }
      } else {
        const groupId = item.id;
        const isSelected = selectedFromUsers.find(group => group.id === groupId);
        if (isSelected) {
          newSelectedUsers = selectedFromUsers.filter(group => group.id !== groupId);
        } else {
          const groupItem = {
            id: groupId,
            name: item.name,
            from_group_id: groupId,
            from_group_name: item.name
          };
          newSelectedUsers = [...selectedFromUsers, groupItem];
        }
      }
    }

    this.setState({
      selectedFromUsers: newSelectedUsers,
      currentPage: 1
    }, () => {
      if (shouldFetchData) {
        this.getLogsByPage(1);
      }
    });
  };

  handleToUserFilter = (item, shouldFetchData = true) => {
    const { selectedToUsers, selectedToGroups } = this.state;
    let newSelectedUsers = selectedToUsers;
    let newSelectedGroups = selectedToGroups;

    if (item === null) {
      newSelectedUsers = selectedToUsers;
      newSelectedGroups = selectedToGroups;
    } else {
      if (item.email) {
        const isSelected = selectedToUsers.find(user => user.email === item.email);
        if (isSelected) {
          newSelectedUsers = selectedToUsers.filter(user => user.email !== item.email);
        } else {
          newSelectedUsers = [...selectedToUsers, item];
        }
      } else {
        const groupId = item.to_group_id || item.id;
        const groupName = item.to_group_name || item.name;

        const isSelected = selectedToGroups.find(group => {
          const selectedGroupId = group.to_group_id || group.id;
          return selectedGroupId === groupId;
        });

        if (isSelected) {
          newSelectedGroups = selectedToGroups.filter(group => {
            const selectedGroupId = group.to_group_id || group.id;
            return selectedGroupId !== groupId;
          });
        } else {
          const groupItem = {
            id: groupId,
            name: groupName,
            to_group_id: groupId,
            to_group_name: groupName
          };
          newSelectedGroups = [...selectedToGroups, groupItem];
        }
      }
    }

    this.setState({
      selectedToUsers: newSelectedUsers,
      selectedToGroups: newSelectedGroups,
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


  handleRepoFilter = (repo, shouldFetchData = true) => {
    const { selectedRepos } = this.state;
    let newSelectedRepos;

    if (repo === null) {
      newSelectedRepos = [];
    } else {
      const isSelected = selectedRepos.find(item => item.id === repo.id);
      if (isSelected) {
        newSelectedRepos = selectedRepos.filter(item => item.id !== repo.id);
      } else {
        newSelectedRepos = [...selectedRepos, repo];
      }
    }

    this.setState({
      selectedRepos: newSelectedRepos,
      currentPage: 1
    }, () => {
      if (shouldFetchData) {
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

  searchRepos = (value) => {
    return systemAdminAPI.sysAdminSearchRepos(value);
  };

  render() {
    let {
      logList, currentPage, perPage, hasNextPage,
      availableUsers, selectedFromUsers,
      selectedToUsers, selectedToGroups,
      selectedOperators,
      availableRepos, selectedRepos,
      openSelector
    } = this.state;

    const selectedToItems = [
      ...selectedToUsers,
      ...selectedToGroups.map(group => ({
        id: group.to_group_id || group.id,
        name: group.to_group_name || group.name,
        to_group_id: group.to_group_id || group.id,
        to_group_name: group.to_group_name || group.name
      }))
    ];

    return (
      <div className="main-panel-center flex-row">
        <div className="cur-view-container">
          <div className="cur-view-content">
            <div className="d-flex align-items-center mb-2">
              <LogUserSelector
                componentName={gettext('Transfer From')}
                items={availableUsers}
                selectedItems={selectedFromUsers}
                onSelect={this.handleFromUserFilter}
                isOpen={openSelector === 'fromUser'}
                onToggle={() => this.handleSelectorToggle('fromUser')}
                searchUsersFunc={this.searchUsers}
                searchGroupsFunc={this.searchGroups}
              />
              <LogUserSelector
                componentName={gettext('Transfer To')}
                items={availableUsers}
                selectedItems={selectedToItems}
                onSelect={this.handleToUserFilter}
                isOpen={openSelector === 'toUser'}
                onToggle={() => this.handleSelectorToggle('toUser')}
                searchUsersFunc={this.searchUsers}
                searchGroupsFunc={this.searchGroups}
              />
              <LogUserSelector
                componentName={gettext('Operator')}
                items={availableUsers}
                selectedItems={selectedOperators}
                onSelect={this.handleOperatorFilter}
                isOpen={openSelector === 'operator'}
                onToggle={() => this.handleSelectorToggle('operator')}
                searchUsersFunc={this.searchUsers}
              />
              <div className="mx-3"></div>
              <LogRepoSelector
                items={availableRepos}
                selectedItems={selectedRepos}
                onSelect={this.handleRepoFilter}
                isOpen={openSelector === 'repo'}
                onToggle={() => this.handleSelectorToggle('repo')}
                searchReposFunc={this.searchRepos}
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
          </div>
        </div>
      </div>
    );
  }
}

export default FIleTransferLogs;
