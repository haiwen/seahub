import React, { Component, Fragment } from 'react';
import { seafileAPI } from '../../../utils/seafile-api';
import { gettext, loginUrl, siteRoot, enableSysAdminViewRepo, isPro } from '../../../utils/constants';
import { Utils } from '../../../utils/utils';
import EmptyTip from '../../../components/empty-tip';
import moment from 'moment';
import Loading from '../../../components/loading';
import Paginator from '../../../components/paginator';
import LogsNav from './logs-nav';
import MainPanelTopbar from '../main-panel-topbar';


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
          <h2>{gettext('No Admin Operation Logs.')}</h2>
        </EmptyTip>
      );
      const table = (
        <Fragment>
          <table className="table-hover">
            <thead>
              <tr>
                <th width="20%">{gettext('Name')}</th>
                <th width="15%">{gettext('Operation')}</th>
                <th width="50%">{gettext('Detail')}</th>
                <th width="15%">{gettext('Time')}</th>
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

  getOperationText = (operationType) => {
    switch (operationType) {
      case 'repo_create': return gettext('Create Library');
      case 'repo_delete': return gettext('Delete Library');
      case 'repo_transfer': return gettext('Transfer Library');
      case 'group_create': return gettext('Create Group');
      case 'group_transfer': return gettext('Transfer Group');
      case 'group_delete': return gettext('Delete Group');
      case 'user_add': return gettext('Add User');
      case 'user_delete': return gettext('Delete User');
      default: return '';
    }
  }

  getOperationDetail = (item) => {
    let detail = item.detail;

    let ownerPageUrl = '';
    if (detail.owner) {
      ownerPageUrl = siteRoot + 'useradmin/info/' + detail.owner + '/';
    }
    let userPageUrl = '';
    if (detail.email) {
      userPageUrl = siteRoot + 'useradmin/info/' + detail.email + '/';
    }
    let detailText = '';
    let repoPageUrl = '';
    let groupPageUrl = '';
    if (item.operation == 'repo_create' || item.operation == 'repo_delete' || item.operation == 'repo_transfer') {
      repoPageUrl = siteRoot + 'sys/libraries/' + detail.id + '/' + detail.name + '/';
    }
    if (item.operation == 'group_create' || item.operation == 'group_delete' || item.operation == 'group_transfer') {
      groupPageUrl = siteRoot + 'sys/groups/' + detail.id + '/libraries/';
    }

    switch (item.operation) {
      case 'repo_create':
        detailText = gettext('Created library {library_name} with {owner} as its owner')
          .replace('{owner}', '<a href="' + ownerPageUrl + '">' + detail.owner + '</a>');
        if (isPro && enableSysAdminViewRepo) {
          detailText = detailText.replace('{library_name}', '<a href="' + repoPageUrl + '">' + detail.name + '</a>');
        } else {
          detailText = detailText.replace('{library_name}', '<span class="font-weight-bold">' + detail.name + '</span>');
        }
        return detailText;

      case 'repo_delete':
        detailText = gettext('Deleted library {library_name}')
          .replace('{library_name}', '<span class="font-weight-bold">' + detail.name + '</span>');
        return detailText;

      case 'repo_transfer':
        detailText = gettext('Transferred library {library_name} from {user_from} to {user_to}')
          .replace('{user_from}', '<span class="font-weight-bold">' + detail.from + '</span>')
          .replace('{user_to}', '<span class="font-weight-bold">' + detail.to+ '</span>');
        if (isPro && enableSysAdminViewRepo) {
          detailText = detailText.replace('{library_name}', '<a href="' + repoPageUrl + '">' + detail.name + '</a>');
        } else {
          detailText = detailText.replace('{library_name}', '<span class="font-weight-bold">' + detail.name + '</span>');
        }
        return detailText;

      case 'group_create':
        detailText = gettext('Created group {group_name}')
          .replace('{group_name}', '<a href="' + groupPageUrl + '">' + detail.name+ '</a>');
        return detailText;

      case 'group_transfer':
        detailText = gettext('Transferred group {group_name} from {user_from} to {user_to}')
          .replace('{user_from}', '<span class="font-weight-bold">' + detail.from + '</span>')
          .replace('{user_to}', '<span class="font-weight-bold">' + detail.to+ '</span>')
          .replace('{group_name}', '<a href="' + groupPageUrl + '">' + detail.name+ '</a>');
        return detailText;

      case 'group_delete':
        detailText = gettext('Deleted group {group_name}')
          .replace('{group_name}', '<span class="font-weight-bold">' + detail.name + '</span>');
        return detailText;

      case 'user_add':
        detailText = gettext('Added user {user}')
          .replace('{user}', '<a href="' + userPageUrl + '">' + detail.email+ '</a>');
        return detailText;

      case 'user_delete':
        detailText = gettext('Deleted user {user}')
          .replace('{user}', '<span class="font-weight-bold">' + detail.email+ '</span>');
        return detailText;

      default: return '';
    }
  }

  render() {
    let { item } = this.props;
    return (
      <tr onMouseOver={this.handleMouseOver} onMouseOut={this.handleMouseOut}>
        <td><a href={siteRoot + 'useradmin/info/' + item.email + '/'}>{item.name}</a></td>
        <td>{this.getOperationText(item.operation)}</td>
        <td>
          <span dangerouslySetInnerHTML={{__html: this.getOperationDetail(item)}}></span>
        </td>
        <td>{moment(item.datetime).fromNow()}</td>
      </tr>
    );
  }
}

class AdminOperationLogs extends Component {

  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: '',
      logList: [],
      perPage: 100,
      currentPage: 1,
      hasNextPage: false,
    };
    this.initPage = 1;
  }

  componentDidMount () {
    this.getLogsByPage(this.initPage);
  }

  getLogsByPage = (page) => {
    let { perPage } = this.state;
    seafileAPI.sysAdminListAdminLogs(page, perPage).then((res) => {
      this.setState({
        logList: res.data.data,
        loading: false,
        currentPage: page,
        hasNextPage: Utils.hasNextPage(page, perPage, res.data.total_count),
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
    let { logList, currentPage, perPage, hasNextPage } = this.state;
    return (
      <Fragment>
        <MainPanelTopbar />
        <div className="main-panel-center flex-row">
          <div className="cur-view-container">
            <LogsNav currentItem="adminOperationLogs" />
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
      </Fragment>
    );
  }
}

export default AdminOperationLogs;
