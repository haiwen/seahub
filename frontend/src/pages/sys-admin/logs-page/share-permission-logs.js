import React, { Component } from 'react';
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
        <EmptyTip text={gettext('No permission logs')}>
        </EmptyTip>
      );
      const table = (
        <>
          <table className="table-hover">
            <thead>
              <tr>
                <th width="15%">{gettext('Share From')}</th>
                <th width="15%">{gettext('Share To')}</th>
                <th width="10%">{gettext('Actions')}</th>
                <th width="13%">{gettext('Permission')}</th>
                <th width="20%">{gettext('Library')}</th>
                <th width="12%">{gettext('Folder')}</th>
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
        </>
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

  getActionTextByEType = (etype) => {
    if (etype.indexOf('add') != -1) {
      return gettext('Add');
    } else if (etype.indexOf('modify') != -1) {
      return gettext('Modify');
    } else if (etype.indexOf('delete') != -1) {
      return gettext('Delete');
    } else {
      return '';
    }
  };

  getShareTo = (item) => {
    switch (item.share_type) {
      case 'user':
        return <UserLink email={item.to_user_email} name={item.to_user_name} />;
      case 'group':
      case 'department':
        return <Link to={`${siteRoot}sys/groups/${item.to_group_id}/libraries/`}>{item.to_group_name}</Link>;
      case 'all':
        return <Link to={`${siteRoot}org/`}>{gettext('All')}</Link>;
      default:
        return gettext('Deleted');
    }
  };

  render() {
    let { item } = this.props;
    return (
      <tr>
        <td><UserLink email={item.from_user_email} name={item.from_user_name} /></td>
        <td>{this.getShareTo(item)}</td>
        <td>{this.getActionTextByEType(item.etype)}</td>
        <td>{Utils.sharePerms(item.permission)}</td>
        <td>{item.repo_name ? item.repo_name : gettext('Deleted')}</td>
        <td>{item.folder}</td>
        <td>{dayjs(item.date).fromNow()}</td>
      </tr>
    );
  }
}

Item.propTypes = {
  item: PropTypes.object.isRequired,
};

class SharePermissionLogs extends Component {

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
      selectedFromUsers: [],
      selectedToUsers: [],
      selectedToGroups: [],
      availableRepos: [],
      selectedRepos: [],
      openSelector: null,
    };
    this.initPage = 1;
  }

  toggleExportExcelDialog = () => {
    this.setState({ isExportExcelDialogOpen: !this.state.isExportExcelDialogOpen });
  };

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
      selectedRepos
    } = this.state;

    const options = {
      'from_email': selectedFromUsers.map(user => user.email),
      'to_email': selectedToUsers.map(user => user.email),
      'to_group': selectedToGroups.map(group => group.id),
      'repo': selectedRepos.map(repo => repo.id)
    };
    systemAdminAPI.sysAdminListSharePermissionLogs(
      page,
      perPage,
      options
    ).then((res) => {
      this.setState({
        logList: res.data.share_permission_log_list,
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
        const isSelected = selectedToGroups.find(group => group.id === item.id);
        if (isSelected) {
          newSelectedGroups = selectedToGroups.filter(group => group.id !== item.id);
        } else {
          newSelectedGroups = [...selectedToGroups, item];
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
      newSelectedRepos = selectedRepos;
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

  searchGroups = (value) => {
    return systemAdminAPI.sysAdminSearchGroups(value);
  };

  render() {
    let {
      logList, currentPage, perPage, hasNextPage,
      availableUsers, selectedFromUsers, selectedToUsers,
      selectedToGroups, availableRepos, selectedRepos, openSelector
    } = this.state;
    return (
      <div className="main-panel-center flex-row">
        <div className="cur-view-container">
          <div className="cur-view-content">
            <div className="d-flex align-items-center mb-2">
              <LogUserSelector
                componentName={gettext('Share From')}
                items={availableUsers}
                selectedItems={selectedFromUsers}
                onSelect={this.handleFromUserFilter}
                isOpen={openSelector === 'fromUser'}
                onToggle={() => this.handleSelectorToggle('fromUser')}
                searchUsersFunc={this.searchUsers}
              />
              <LogUserSelector
                componentName={gettext('Share To')}
                items={availableUsers}
                selectedItems={[...selectedToUsers, ...selectedToGroups]}
                onSelect={this.handleToUserFilter}
                isOpen={openSelector === 'toUser'}
                onToggle={() => this.handleSelectorToggle('toUser')}
                searchUsersFunc={this.searchUsers}
                searchGroupsFunc={this.searchGroups}
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

export default SharePermissionLogs;
