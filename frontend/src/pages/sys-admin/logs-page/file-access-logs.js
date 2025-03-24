import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { Button } from 'reactstrap';
import { navigate } from '@gatsbyjs/reach-router';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { systemAdminAPI } from '../../../utils/system-admin-api';
import { gettext } from '../../../utils/constants';
import { Utils } from '../../../utils/utils';
import EmptyTip from '../../../components/empty-tip';
import Loading from '../../../components/loading';
import Paginator from '../../../components/paginator';
import LogsExportExcelDialog from '../../../components/dialog/sysadmin-dialog/sysadmin-logs-export-excel-dialog';
import ModalPortal from '../../../components/modal-portal';
import LogsNav from './logs-nav';
import MainPanelTopbar from '../main-panel-topbar';
import UserLink from '../user-link';
import LogUserSelector from '../../dashboard/log-user-selector';
import LogRepoSelector from '../../dashboard/log-repo-selector';

dayjs.extend(relativeTime);

class Content extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isItemFreezed: false
    };
  }

  getPreviousPage = () => {
    this.props.getLogsByPage(this.props.currentPage - 1);
  };

  getNextPage = () => {
    this.props.getLogsByPage(this.props.currentPage + 1);
  };

  toggleFreezeItem = (freezed) => {
    this.setState({
      isItemFreezed: freezed
    });
  };

  render() {
    const {
      loading, errorMsg, items,
      perPage, currentPage, hasNextPage
    } = this.props;
    if (loading) {
      return <Loading />;
    } else if (errorMsg) {
      return <p className="error text-center">{errorMsg}</p>;
    } else {
      const emptyTip = (
        <EmptyTip text={gettext('No file access logs')}>
        </EmptyTip>
      );
      const table = (
        <Fragment>
          <table>
            <thead>
              <tr>
                <th width="20%">{gettext('Name')}</th>
                <th width="10%">{gettext('Type')}</th>
                <th width="20%">{gettext('IP')}{' / '}{gettext('Device')}</th>
                <th width="20%">{gettext('Date')}</th>
                <th width="15%">{gettext('Library')}</th>
                <th width="15%">{gettext('File')}{' / '}{gettext('Folder')}</th>
              </tr>
            </thead>
            {items &&
              <tbody>
                {items.map((item, index) => {
                  return (<Item
                    key={index}
                    item={item}
                    isFreezed={this.state.isItemFreezed}
                    toggleFreezeItem={this.toggleFreezeItem}
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
  loading: PropTypes.bool,
  errorMsg: PropTypes.string,
  items: PropTypes.array,
  getLogsByPage: PropTypes.func,
  resetPerPage: PropTypes.func,
  currentPage: PropTypes.number,
  perPage: PropTypes.number,
  pageInfo: PropTypes.object,
  hasNextPage: PropTypes.bool,
  toggleFreezeItem: PropTypes.func
};


class Item extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isHighlighted: false,
    };
  }

  handleMouseEnter = () => {
    if (!this.props.isFreezed) {
      this.setState({
        isHighlighted: true,
      });
    }
  };

  handleMouseLeave = () => {
    if (!this.props.isFreezed) {
      this.setState({
        isHighlighted: false,
      });
    }
  };

  toggleFreezeItem = (freezed) => {
    this.props.toggleFreezeItem(freezed);
    if (!freezed) {
      this.setState({
        isHighlighted: false,
      });
    }
  };

  render() {
    const { isHighlighted } = this.state;
    const { item } = this.props;
    return (
      <tr className={isHighlighted ? 'tr-highlight' : ''} onMouseEnter={this.handleMouseEnter} onMouseLeave={this.handleMouseLeave}>
        <td>
          <UserLink email={item.email} name={item.name} />
        </td>
        <td>{item.event_type}</td>
        <td>{item.ip}{' / '}{item.device || '--'}</td>
        <td>{dayjs(item.time).fromNow()}</td>
        <td>
          {item.repo_name ? item.repo_name : gettext('Deleted')}
        </td>
        <td>{item.file_or_dir_name}</td>
      </tr>
    );
  }
}


Item.propTypes = {
  item: PropTypes.object,
  isFreezed: PropTypes.bool,
  toggleFreezeItem: PropTypes.func,
};

class FileAccessLogs extends Component {

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
      currentPage: parseInt(urlParams.get('page') || currentPage),
    }, () => {
      this.getLogsByPage(this.state.currentPage);
    });
  }

  getLogsByPage = (page) => {
    const { perPage, selectedUsers, selectedRepos } = this.state;
    let emails = selectedUsers.map(user => user.email);
    systemAdminAPI.sysAdminListFileAccessLogs(page, perPage, emails, selectedRepos).then((res) => {
      this.setState({
        logList: res.data.file_access_log_list,
        loading: false,
        currentPage: page,
        hasNextPage: res.data.has_next_page,
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

  updateURL = (obj) => {
    let url = new URL(location.href);
    let searchParams = new URLSearchParams(url.search);
    for (let key in obj) {
      obj[key] == null ?
        searchParams.delete(key) :
        searchParams.set(key, obj[key]);
    }
    url.search = searchParams.toString();
    navigate(url.toString());
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

  searchRepos = (value) => {
    return systemAdminAPI.sysAdminSearchRepos(value);
  };

  render() {
    const {
      logList,
      currentPage, perPage, hasNextPage,
      isExportExcelDialogOpen,
      availableUsers,
      selectedUsers,
      availableRepos,
      selectedRepos,
      openSelector
    } = this.state;
    return (
      <Fragment>
        <MainPanelTopbar {...this.props}>
          <Button className="btn btn-secondary operation-item" onClick={this.toggleExportExcelDialog}>{gettext('Export Excel')}</Button>
        </MainPanelTopbar>
        <div className="main-panel-center flex-row">
          <div className="cur-view-container">
            <LogsNav currentItem="fileAccessLogs" />
            <div className="cur-view-content">
              <Fragment>
                <div className="d-flex align-items-center mb-2">
                  <LogUserSelector
                    componentName="Users"
                    items={availableUsers}
                    selectedItems={selectedUsers}
                    onSelect={this.handleUserFilter}
                    isOpen={openSelector === 'user'}
                    onToggle={() => this.handleSelectorToggle('user')}
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
        {isExportExcelDialogOpen &&
        <ModalPortal>
          <LogsExportExcelDialog
            logType={'fileAccess'}
            toggle={this.toggleExportExcelDialog}
          />
        </ModalPortal>
        }
      </Fragment>
    );
  }
}

export default FileAccessLogs;
