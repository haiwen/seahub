import React, { Component } from 'react';
import PropTypes from 'prop-types';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { systemAdminAPI } from '../../../utils/system-admin-api';
import { gettext, siteRoot, enableSysAdminViewRepo, isPro } from '../../../utils/constants';
import { Utils } from '../../../utils/utils';
import EmptyTip from '../../../components/empty-tip';
import Loading from '../../../components/loading';
import Paginator from '../../../components/paginator';
import UserLink from '../user-link';

dayjs.extend(relativeTime);

class Content extends Component {

  constructor(props) {
    super(props);
  }

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
        <EmptyTip text={gettext('No Admin operation logs')}>
        </EmptyTip>
      );
      const table = (
        <>
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
      case 'user_migrate': return gettext('Migrate User');
      case 'group_member_add': return gettext('Add User to Group');
      case 'group_member_delete': return gettext('Delete User from Group');
      default: return '';
    }
  };

  getOperationDetail = (item) => {
    let detail = item.detail;

    let ownerPageUrl = '';
    if (detail.owner) {
      ownerPageUrl = siteRoot + 'sys/users/' + encodeURIComponent(detail.owner) + '/';
    }
    let userPageUrl = '';
    if (detail.email) {
      userPageUrl = siteRoot + 'sys/users/' + encodeURIComponent(detail.email) + '/';
    }
    let detailText = '';
    let repoPageUrl = '';
    let groupPageUrl = '';
    if (item.operation == 'repo_create' || item.operation == 'repo_delete' || item.operation == 'repo_transfer') {
      repoPageUrl = siteRoot + 'sys/libraries/' + detail.id + '/' + encodeURIComponent(detail.name) + '/';
    }
    if (item.operation == 'group_create' || item.operation == 'group_delete' || item.operation == 'group_transfer') {
      groupPageUrl = siteRoot + 'sys/groups/' + detail.id + '/libraries/';
    }

    switch (item.operation) {
      case 'repo_create':
        detailText = gettext('Created library {library_name} with {owner} as its owner')
          .replace('{owner}', '<a href="' + ownerPageUrl + '">' + detail.owner + '</a>');
        if (isPro && enableSysAdminViewRepo) {
          detailText = detailText.replace('{library_name}', '<a href="' + repoPageUrl + '">' + Utils.HTMLescape(detail.name) + '</a>');
        } else {
          detailText = detailText.replace('{library_name}', '<span class="font-weight-bold">' + Utils.HTMLescape(detail.name) + '</span>');
        }
        return detailText;

      case 'repo_delete':
        detailText = gettext('Deleted library {library_name}')
          .replace('{library_name}', '<span class="font-weight-bold">' + Utils.HTMLescape(detail.name) + '</span>');
        return detailText;

      case 'repo_transfer':
        detailText = gettext('Transferred library {library_name} from {user_from} to {user_to}')
          .replace('{user_from}', '<span class="font-weight-bold">' + detail.from + '</span>')
          .replace('{user_to}', '<span class="font-weight-bold">' + detail.to + '</span>');
        if (isPro && enableSysAdminViewRepo) {
          detailText = detailText.replace('{library_name}', '<a href="' + repoPageUrl + '">' + Utils.HTMLescape(detail.name) + '</a>');
        } else {
          detailText = detailText.replace('{library_name}', '<span class="font-weight-bold">' + Utils.HTMLescape(detail.name) + '</span>');
        }
        return detailText;

      case 'group_create':
        detailText = gettext('Created group {group_name}')
          .replace('{group_name}', '<a href="' + groupPageUrl + '">' + detail.name + '</a>');
        return detailText;

      case 'group_transfer':
        detailText = gettext('Transferred group {group_name} from {user_from} to {user_to}')
          .replace('{user_from}', '<span class="font-weight-bold">' + detail.from + '</span>')
          .replace('{user_to}', '<span class="font-weight-bold">' + detail.to + '</span>')
          .replace('{group_name}', '<a href="' + groupPageUrl + '">' + detail.name + '</a>');
        return detailText;

      case 'group_delete':
        detailText = gettext('Deleted group {group_name}')
          .replace('{group_name}', '<span class="font-weight-bold">' + detail.name + '</span>');
        return detailText;

      case 'user_add':
        detailText = gettext('Added user {user}')
          .replace('{user}', '<a href="' + userPageUrl + '">' + detail.email + '</a>');
        return detailText;

      case 'user_delete':
        detailText = gettext('Deleted user {user}')
          .replace('{user}', '<span class="font-weight-bold">' + detail.email + '</span>');
        return detailText;

      case 'user_migrate':
        detailText = gettext('User migrate from {user_from} to {user_to}')
          .replace('{user_from}', '<span class="font-weight-bold">' + detail.from + '</span>')
          .replace('{user_to}', '<span class="font-weight-bold">' + detail.to + '</span>');
        return detailText;

      case 'group_member_add':
        detailText = gettext('Added user {user} to group {group}')
          .replace('{user}', '<span class="font-weight-bold">' + detail.user + '</span>')
          .replace('{group}', '<span class="font-weight-bold">' + detail.name + '</span>');
        return detailText;

      case 'group_member_delete':
        detailText = gettext('Deleted user {user} from group {group}')
          .replace('{user}', '<span class="font-weight-bold">' + detail.user + '</span>')
          .replace('{group}', '<span class="font-weight-bold">' + detail.name + '</span>');
        return detailText;

      default: return '';
    }
  };

  render() {
    let { item } = this.props;
    return (
      <tr onMouseOver={this.handleMouseOver} onMouseOut={this.handleMouseOut}>
        <td><UserLink email={item.email} name={item.name} /></td>
        <td>{this.getOperationText(item.operation)}</td>
        <td>
          <span dangerouslySetInnerHTML={{ __html: this.getOperationDetail(item) }}></span>
        </td>
        <td>{dayjs(item.datetime).fromNow()}</td>
      </tr>
    );
  }
}

Item.propTypes = {
  item: PropTypes.object.isRequired,
};

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
    systemAdminAPI.sysAdminListAdminLogs(page, perPage).then((res) => {
      this.setState({
        logList: res.data.data,
        loading: false,
        currentPage: page,
        hasNextPage: Utils.hasNextPage(page, perPage, res.data.total_count),
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
    let { logList, currentPage, perPage, hasNextPage } = this.state;
    return (
      <div className="main-panel-center flex-row">
        <div className="cur-view-container">
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
    );
  }
}

export default AdminOperationLogs;
