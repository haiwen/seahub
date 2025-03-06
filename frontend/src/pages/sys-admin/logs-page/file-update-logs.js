import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { Button } from 'reactstrap';
import { systemAdminAPI } from '../../../utils/system-admin-api';
import { gettext } from '../../../utils/constants';
import { Utils } from '../../../utils/utils';
import EmptyTip from '../../../components/empty-tip';
import Loading from '../../../components/loading';
import Paginator from '../../../components/paginator';
import LogsNav from './logs-nav';
import MainPanelTopbar from '../main-panel-topbar';
import UserLink from '../user-link';
import ModalPortal from '../../../components/modal-portal';
import CommitDetails from '../../../components/dialog/commit-details';
import LogsExportExcelDialog from '../../../components/dialog/sysadmin-dialog/sysadmin-logs-export-excel-dialog';
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
        <EmptyTip text={gettext('No file update logs')}>
        </EmptyTip>
      );
      const table = (
        <Fragment>
          <table className="table-hover">
            <thead>
              <tr>
                <th width="25%">{gettext('Name')}</th>
                <th width="25%">{gettext('Date')}</th>
                <th width="25%">{gettext('Library')}</th>
                <th width="25%">{gettext('Action')}</th>
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
      isCommitDetailsDialogOpen: false,
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


  toggleCommitDetailsDialog = () => {
    this.setState({
      isCommitDetailsDialogOpen: !this.state.isCommitDetailsDialogOpen
    });
  };

  showCommitDetails = (e) => {
    e.preventDefault();
    this.setState({
      isCommitDetailsDialogOpen: !this.state.isCommitDetailsDialogOpen
    });
  };

  render() {
    let { item } = this.props;
    return (
      <Fragment>
        <tr onMouseOver={this.handleMouseOver} onMouseOut={this.handleMouseOut}>
          <td><UserLink email={item.email} name={item.name} /></td>
          <td>{dayjs(item.time).fromNow()}</td>
          <td>{item.repo_name ? item.repo_name : gettext('Deleted')}</td>
          <td>
            {item.file_operation}
            {item.repo_name && !item.repo_encrypted &&
              <a className="ml-1" href="#" onClick={this.showCommitDetails}>{gettext('Details')}</a>
            }
          </td>
        </tr>
        {this.state.isCommitDetailsDialogOpen &&
          <ModalPortal>
            <CommitDetails
              repoID={item.repo_id}
              commitID={item.commit_id}
              commitTime={item.time}
              toggleDialog={this.toggleCommitDetailsDialog}
            />
          </ModalPortal>
        }
      </Fragment>
    );
  }
}


Item.propTypes = {
  item: PropTypes.object.isRequired,
};


class FileUpdateLogs extends Component {

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
    let { perPage, selectedUsers } = this.state;
    let emails = selectedUsers.map(user => user.email);

    systemAdminAPI.sysAdminListFileUpdateLogs(page, perPage, emails).then((res) => {
      this.setState({
        logList: res.data.file_update_log_list,
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

  render() {
    let { logList, currentPage, perPage, hasNextPage, isExportExcelDialogOpen, availableUsers, selectedUsers } = this.state;
    return (
      <Fragment>
        <MainPanelTopbar {...this.props}>
          <Button className="btn btn-secondary operation-item" onClick={this.toggleExportExcelDialog}>{gettext('Export Excel')}</Button>
        </MainPanelTopbar>
        <div className="main-panel-center flex-row">
          <div className="cur-view-container">
            <LogsNav currentItem="fileUpdateLogs" />
            <div className="cur-view-content">
              <Fragment>
                <LogUserSelector
                  label={gettext('User')}
                  items={availableUsers}
                  selectedItems={selectedUsers}
                  onSelect={this.handleUserFilter}
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
              </Fragment>
            </div>
          </div>
        </div>
        {isExportExcelDialogOpen &&
        <ModalPortal>
          <LogsExportExcelDialog
            logType={'fileUpdate'}
            toggle={this.toggleExportExcelDialog}
          />
        </ModalPortal>
        }
      </Fragment>
    );
  }
}

export default FileUpdateLogs;
