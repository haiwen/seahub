import React, { Component, Fragment } from 'react';
import { seafileAPI } from '../../../utils/seafile-api';
import { gettext, loginUrl, siteRoot } from '../../../utils/constants';
import { Utils } from '../../../utils/utils';
import EmptyTip from '../../../components/empty-tip';
import moment from 'moment';
import { Button } from 'reactstrap';
import Loading from '../../../components/loading';
import Paginator from '../../../components/paginator';
import LogsNav from './logs-nav';
import MainPanelTopbar from '../main-panel-topbar';
import LogsExportExcelDialog from '../../../components/dialog/sysadmin-dialog/sysadmin-logs-export-excel-dialog';
import ModalPortal from '../../../components/modal-portal';

class Content extends Component {

  constructor(props) {
    super(props);
  }

  getPreviousPage = () => {
    this.props.getLogsByPage(this.props.currentPage - 1);
  }

  getNextPage = () => {
    this.props.getLogsByPage(this.props.currentPage + 1);
  }

  render() {
    const { loading, errorMsg, items, perPage, currentPage, hasNextPage } = this.props;
    if (loading) {
      return <Loading />;
    } else if (errorMsg) {
      return <p className="error text-center">{errorMsg}</p>;
    } else {
      const emptyTip = (
        <EmptyTip>
          <h2>{gettext('No Permission Logs.')}</h2>
        </EmptyTip>
      );
      const table = (
        <Fragment>
          <table className="table-hover">
            <thead>
              <tr>
                <th width="10%">{gettext('Share From')}</th>
                <th width="10%">{gettext('Share To')}</th>
                <th width="20%">{gettext('Actions')}</th>
                <th width="10%">{gettext('Permission')}</th>
                <th width="20%">{gettext('Library')}</th>
                <th width="15%">{gettext('Folder')}</th> 
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
            canResetPerPage={true}
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
      isOpIconShown: false,
    };
  }

  handleMouseOver = () => {
    this.setState({
      isOpIconShown: true
    });
  }

  handleMouseOut = () => {
    this.setState({
      isOpIconShown: false
    });
  }

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
  }

  render() {
    let { item } = this.props;
    return (
      <tr onMouseOver={this.handleMouseOver} onMouseOut={this.handleMouseOut}>
        <td><a href={siteRoot + 'useradmin/info/' + item.from_user_email + '/'}>{item.from_user_name}</a></td>
        <td><a href={siteRoot + 'useradmin/info/' + item.to_user_email + '/'}>{item.to_user_name}</a></td>
        <td>{this.getActionTextByEType(item.etype)}</td>
        <td>{Utils.sharePerms(item.permission)}</td>
        <td>{item.repo_name ? item.repo_name : gettext('Deleted')}</td>
        <td>{item.folder}</td>
        <td>{moment(item.date).fromNow()}</td>
      </tr>
    );
  }
}

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
    this.setState({isExportExcelDialogOpen: !this.state.isExportExcelDialogOpen});
  }

  componentDidMount () {
    this.getLogsByPage(this.initPage);
  }

  getLogsByPage = (page) => {
    let { perPage } = this.state;
    seafileAPI.sysAdminListSharePermissionLogs(page, perPage).then((res) => {
      this.setState({
        logList: res.data.share_permission_log_list,
        loading: false,
        currentPage: page,
        hasNextPage: res.data.has_next_page,
      });
    }).catch((error) => {
      if (error.response) {
        if (error.response.status == 403) {
          this.setState({
            loading: false,
            errorMsg: gettext('Permission denied')
          });
          location.href = `${loginUrl}?next=${encodeURIComponent(location.href)}`;
        } else {
          this.setState({
            loading: false,
            errorMsg: gettext('Error')
          });
        }
      } else {
        this.setState({
          loading: false,
          errorMsg: gettext('Please check the network.')
        });
      }
    });
  }

  resetPerPage = (newPerPage) => {
    this.setState({
      perPage: newPerPage,
    }, () => this.getLogsByPage(this.initPage));
  }

  render() {
    let { logList, currentPage, perPage, hasNextPage, isExportExcelDialogOpen } = this.state;
    return (
      <Fragment>
        <MainPanelTopbar>
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
