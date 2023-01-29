import React, { Component, Fragment } from 'react';
import { seafileAPI } from '../../../utils/seafile-api';
import { gettext } from '../../../utils/constants';
import { Utils } from '../../../utils/utils';
import EmptyTip from '../../../components/empty-tip';
import { Button } from 'reactstrap';
import { navigate } from '@gatsbyjs/reach-router';
import moment from 'moment';
import Loading from '../../../components/loading';
import Paginator from '../../../components/paginator';
import LogsExportExcelDialog from '../../../components/dialog/sysadmin-dialog/sysadmin-logs-export-excel-dialog';
import ModalPortal from '../../../components/modal-portal';
import LogsNav from './logs-nav';
import FilterMenu from './file-access-item-menu';
import ToggleFilter from './file-access-toggle-filter';
import MainPanelTopbar from '../main-panel-topbar';
import UserLink from '../user-link';


class Content extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isItemFreezed: false
    };
  }

  getPreviousPage = () => {
    this.props.getLogsByPage(this.props.currentPage - 1);
  }

  getNextPage = () => {
    this.props.getLogsByPage(this.props.currentPage + 1);
  }

  toggleFilterByUser = () => {
    this.props.filterByUser(null);
  }

  toggleFilterByRepo = () => {
    this.props.filterByRepo(null);
  }

  toggleFreezeItem = (freezed) => {
    this.setState({
      isItemFreezed: freezed
    });
  }

  render() {
    const {
      loading, errorMsg, items, 
      userFilteredBy, repoFilteredBy,
      perPage, currentPage, hasNextPage
    } = this.props;
    if (loading) {
      return <Loading />;
    } else if (errorMsg) {
      return <p className="error text-center">{errorMsg}</p>;
    } else {
      const emptyTip = (
        <EmptyTip>
          <h2>{gettext('No file access logs')}</h2>
        </EmptyTip>
      );
      const table = (
        <Fragment>
          <div>
            {userFilteredBy && (
              <ToggleFilter
                filterBy={items[0].name}
                toggleFilter={this.toggleFilterByUser}
              />
            )}
            {repoFilteredBy && (
              <ToggleFilter
                filterBy={items[0].repo_name}
                toggleFilter={this.toggleFilterByRepo}
              />
            )}
          </div>
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
                    userFilteredBy={userFilteredBy}
                    repoFilteredBy={repoFilteredBy}
                    filterByUser={this.props.filterByUser}
                    filterByRepo={this.props.filterByRepo}
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

class Item extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isHighlighted: false,
      isOpIconShown: false
    };
  }

  handleMouseEnter = () => {
    if (!this.props.isFreezed) {
      this.setState({
        isHighlighted: true,
        isOpIconShown: true
      });
    }
  }

  handleMouseLeave = () => {
    if (!this.props.isFreezed) {
      this.setState({
        isHighlighted: false,
        isOpIconShown: false
      });
    }
  }

  filterByUser = () => {
    const { item } = this.props;
    this.props.filterByUser(item.email);
  }

  filterByRepo = () => {
    const { item } = this.props;
    this.props.filterByRepo(item.repo_id);
  }

  toggleFreezeItem = (freezed) => {
    this.props.toggleFreezeItem(freezed);
    if (!freezed) {
      this.setState({
        isHighlighted: false,
        isOpIconShown: false
      });
    }
  }

  render() {
    const { isHighlighted, isOpIconShown } = this.state;
    const { item, userFilteredBy, repoFilteredBy } = this.props;
    return (
      <tr className={isHighlighted ? 'tr-highlight' : ''} onMouseEnter={this.handleMouseEnter} onMouseLeave={this.handleMouseLeave}>
        <td>
          <UserLink email={item.email} name={item.name} />
          {isOpIconShown && !userFilteredBy && (
            <FilterMenu
              filterBy={item.name}
              filterItems={this.filterByUser}
              toggleFreezeItem={this.toggleFreezeItem}
            />
          )}
        </td>
        <td>{item.event_type}</td>
        <td>{item.ip}{' / '}{item.device || '--'}</td>
        <td>{moment(item.time).fromNow()}</td>
        <td>
          {item.repo_name ? item.repo_name : gettext('Deleted')}
          {isOpIconShown && item.repo_name && !repoFilteredBy && (
            <FilterMenu
              filterBy={item.repo_name}
              filterItems={this.filterByRepo}
              toggleFreezeItem={this.toggleFreezeItem}
            />
          )}
        </td>
        <td>{item.file_or_dir_name}</td>
      </tr>
    );
  }
}

class FileAccessLogs extends Component {

  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: '',
      logList: [],
      perPage: 25,
      currentPage: 1,
      hasNextPage: false,
      isExportExcelDialogOpen: false,
    };
    this.initPage = 1;
  }

  toggleExportExcelDialog = () => {
    this.setState({isExportExcelDialogOpen: !this.state.isExportExcelDialogOpen});
  }

  componentDidMount () {
    let urlParams = (new URL(window.location)).searchParams;
    const { currentPage, perPage } = this.state;
    this.setState({
      perPage: parseInt(urlParams.get('per_page') || perPage),
      currentPage: parseInt(urlParams.get('page') || currentPage),
      userFilteredBy: urlParams.get('email'),
      repoFilteredBy: urlParams.get('repo_id')
    }, () => {
      this.getLogsByPage(this.state.currentPage);
    });
  }

  getLogsByPage = (page) => {
    const { perPage, userFilteredBy, repoFilteredBy } = this.state;
    seafileAPI.sysAdminListFileAccessLogs(page, perPage, userFilteredBy, repoFilteredBy).then((res) => {
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
  }

  resetPerPage = (newPerPage) => {
    this.setState({
      perPage: newPerPage,
    }, () => this.getLogsByPage(this.initPage));
  }

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
  }

  filterByUser = (email) => {
    this.setState({
      userFilteredBy: email 
    }, () => {
      this.getLogsByPage(this.initPage);
      this.updateURL({'email': email});
    });
  }

  filterByRepo = (repoID) => {
    this.setState({
      repoFilteredBy: repoID 
    }, () => {
      this.getLogsByPage(this.initPage);
      this.updateURL({'repo_id': repoID});
    });
  } 

  render() {
    const {
      logList,
      userFilteredBy, repoFilteredBy, 
      currentPage, perPage, hasNextPage,
      isExportExcelDialogOpen
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
              <Content
                loading={this.state.loading}
                errorMsg={this.state.errorMsg}
                items={logList}
                userFilteredBy={userFilteredBy}
                repoFilteredBy={repoFilteredBy}
                filterByUser={this.filterByUser}
                filterByRepo={this.filterByRepo}
                currentPage={currentPage}
                perPage={perPage}
                hasNextPage={hasNextPage}
                getLogsByPage={this.getLogsByPage}
                resetPerPage={this.resetPerPage}
              />
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
