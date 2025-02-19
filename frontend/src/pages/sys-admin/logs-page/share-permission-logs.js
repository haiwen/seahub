import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { Link } from '@gatsbyjs/reach-router';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { Button } from 'reactstrap';
import { systemAdminAPI } from '../../../utils/system-admin-api';
import { gettext, siteRoot } from '../../../utils/constants';
import { Utils } from '../../../utils/utils';
import LogsExportExcelDialog from '../../../components/dialog/sysadmin-dialog/sysadmin-logs-export-excel-dialog';
import ModalPortal from '../../../components/modal-portal';
import EmptyTip from '../../../components/empty-tip';
import Loading from '../../../components/loading';
import Paginator from '../../../components/paginator';
import MainPanelTopbar from '../main-panel-topbar';
import UserLink from '../user-link';
import LogsNav from './logs-nav';

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
        <Fragment>
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
    let { perPage } = this.state;
    systemAdminAPI.sysAdminListSharePermissionLogs(page, perPage).then((res) => {
      this.setState({
        logList: res.data.share_permission_log_list,
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

  render() {
    let { logList, currentPage, perPage, hasNextPage, isExportExcelDialogOpen } = this.state;
    return (
      <Fragment>
        <MainPanelTopbar {...this.props}>
          <Button className="btn btn-secondary operation-item" onClick={this.toggleExportExcelDialog}>{gettext('Export Excel')}</Button>
        </MainPanelTopbar>
        <div className="main-panel-center flex-row">
          <div className="cur-view-container">
            <LogsNav currentItem="sharePermissionLogs" />
            <div className="cur-view-content">
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
        {isExportExcelDialogOpen &&
        <ModalPortal>
          <LogsExportExcelDialog
            logType={'sharePermission'}
            toggle={this.toggleExportExcelDialog}
          />
        </ModalPortal>
        }
      </Fragment>
    );
  }
}

export default SharePermissionLogs;
