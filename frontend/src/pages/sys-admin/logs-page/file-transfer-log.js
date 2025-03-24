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
import MainPanelTopbar from '../main-panel-topbar';
import UserLink from '../user-link';
import LogsNav from './logs-nav';
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
    let { perPage, selectedFromUsers, selectedToUsers, selectedOperators, selectedRepos } = this.state;
    const emails = {
      from_emails: selectedFromUsers.map(user => user.email),
      to_emails: selectedToUsers.map(user => user.email),
      operator_emails: selectedOperators.map(user => user.email)
    };

    systemAdminAPI.sysAdminListFileTransferLogs(
      page,
      perPage,
      emails,
      selectedRepos
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

  handleFromUserFilter = (user, shouldFetchData = true) => {
    const { selectedFromUsers } = this.state;
    let newSelectedUsers;

    if (user === null) {
      newSelectedUsers = selectedFromUsers;
    } else {
      const isSelected = selectedFromUsers.find(item => item.email === user.email);
      if (isSelected) {
        newSelectedUsers = selectedFromUsers.filter(item => item.email !== user.email);
      } else {
        newSelectedUsers = [...selectedFromUsers, user];
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

  handleToUserFilter = (user, shouldFetchData = true) => {
    const { selectedToUsers } = this.state;
    let newSelectedUsers;

    if (user === null) {
      newSelectedUsers = selectedToUsers;
    } else {
      const isSelected = selectedToUsers.find(item => item.email === user.email);
      if (isSelected) {
        newSelectedUsers = selectedToUsers.filter(item => item.email !== user.email);
      } else {
        newSelectedUsers = [...selectedToUsers, user];
      }
    }

    this.setState({
      selectedToUsers: newSelectedUsers,
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

  getAvailableRepos = () => {
    systemAdminAPI.sysAdminListRepos().then((res) => {
      this.setState({
        availableRepos: res.data.repos
      });
    }).catch((error) => {
      this.setState({
        errorMsg: Utils.getErrorMsg(error, true)
      });
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

  searchRepos = (value) => {
    return systemAdminAPI.sysAdminSearchRepos(value);
  };

  render() {
    let {
      logList, currentPage, perPage, hasNextPage,
      availableUsers, selectedFromUsers, selectedToUsers, selectedOperators,
      availableRepos, selectedRepos,
      openSelector
    } = this.state;

    return (
      <Fragment>
        <MainPanelTopbar {...this.props} />
        <div className="main-panel-center flex-row">
          <div className="cur-view-container">
            <LogsNav currentItem="fileTransfer" />
            <div className="cur-view-content">
              <Fragment>
                <div className="d-flex align-items-center mb-2">
                  <LogUserSelector
                    componentName="Transfer From"
                    items={availableUsers}
                    selectedItems={selectedFromUsers}
                    onSelect={this.handleFromUserFilter}
                    isOpen={openSelector === 'fromUser'}
                    onToggle={() => this.handleSelectorToggle('fromUser')}
                    searchUsersFunc={this.searchUsers}
                  />
                  <LogUserSelector
                    componentName="Transfer To"
                    items={availableUsers}
                    selectedItems={selectedToUsers}
                    onSelect={this.handleToUserFilter}
                    isOpen={openSelector === 'toUser'}
                    onToggle={() => this.handleSelectorToggle('toUser')}
                    searchUsersFunc={this.searchUsers}
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
              </Fragment>
            </div>
          </div>
        </div>
      </Fragment>
    );
  }
}

export default FIleTransferLogs;
