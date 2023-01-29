import React, { Component, Fragment } from 'react';
import moment from 'moment';
import { Utils } from '../../../utils/utils';
import { seafileAPI } from '../../../utils/seafile-api';
import { gettext, siteRoot } from '../../../utils/constants';
import EmptyTip from '../../../components/empty-tip';
import Loading from '../../../components/loading';
import Paginator from '../../../components/paginator';
import UsersNav from './users-nav';
import MainPanelTopbar from '../main-panel-topbar';
import UserLink from '../user-link';

class Content extends Component {

  constructor(props) {
    super(props);
  }

  getPreviousPage = () => {
    this.props.getListByPage(this.props.currentPage - 1);
  }

  getNextPage = () => {
    this.props.getListByPage(this.props.currentPage + 1);
  }

  render() {
    const { loading, errorMsg, items, curPerPage, hasNextPage, currentPage } = this.props;
    if (loading) {
      return <Loading />;
    } else if (errorMsg) {
      return <p className="error text-center mt-4">{errorMsg}</p>;
    } else {
      const emptyTip = (
        <EmptyTip>
          <h2>{gettext('No users')}</h2>
        </EmptyTip>
      );
      const table = (
        <Fragment>
          <table className="table-hover">
            <thead>
              <tr>
                <th width="40%">{gettext('Email')}</th>
                <th width="30%">{gettext('Space Used')}{' / '}{gettext('Quota')}</th>
                <th width="30%">{gettext('Last Login')}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                return (<Item
                  key={index}
                  item={item}
                />);
              })}
            </tbody>
          </table>
          <Paginator
            gotoPreviousPage={this.getPreviousPage}
            gotoNextPage={this.getNextPage}
            currentPage={currentPage}
            hasNextPage={hasNextPage}
            curPerPage={curPerPage}
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
  }

  render() {
    const { item } = this.props;
    let email = '<span class="op-target">' + Utils.HTMLescape(item.email) + '</span>';
    return (
      <Fragment>
        <tr>
          <td><UserLink email={item.email} name={item.email} /></td>
          <td>
            {`${Utils.bytesToSize(item.quota_usage)} / ${item.quota_total > 0 ? Utils.bytesToSize(item.quota_total) : '--'}`}
          </td>
          <td>
            {item.last_login ? moment(item.last_login).fromNow() : '--'}
          </td>
        </tr>
      </Fragment>
    );
  }
}

class Users extends Component {

  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: '',
      userList: {},
      hasNextPage: false,
      currentPage: 1,
      perPage: 25
    };
  }

  componentDidMount () {
    let urlParams = (new URL(window.location)).searchParams;
    const { currentPage, perPage } = this.state;
    this.setState({
      perPage: parseInt(urlParams.get('per_page') || perPage),
      currentPage: parseInt(urlParams.get('page') || currentPage)
    }, () => {
      this.getUsersListByPage(this.state.currentPage);
    });
  }

  getUsersListByPage = (page) => {
    let { perPage } = this.state;
    seafileAPI.sysAdminListLDAPUsers(page, perPage).then(res => {
      this.setState({
        loading: false,
        userList: res.data.ldap_user_list,
        hasNextPage: res.data.has_next_page,
        currentPage: page
      });
    }).catch((error) => {
      this.setState({
        loading: false,
        errorMsg: Utils.getErrorMsg(error, true) // true: show login tip if 403
      });
    });
  }

  resetPerPage = (perPage) => {
    this.setState({
      perPage: perPage
    }, () => {
      this.getUsersListByPage(1);
    });
  }

  render() {
    return (
      <Fragment>
        <MainPanelTopbar {...this.props} />
        <div className="main-panel-center flex-row">
          <div className="cur-view-container">
            <UsersNav currentItem="ldap" />
            <div className="cur-view-content">
              <Content
                resetPerPage={this.resetPerPage}
                loading={this.state.loading}
                errorMsg={this.state.errorMsg}
                items={this.state.userList}
                currentPage={this.state.currentPage}
                hasNextPage={this.state.hasNextPage}
                curPerPage={this.state.perPage}
                getListByPage={this.getUsersListByPage}
              />
            </div>
          </div>
        </div>
      </Fragment>
    );
  }
}

export default Users;
