import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { Utils } from '../../../utils/utils';
import { systemAdminAPI } from '../../../utils/system-admin-api';
import { gettext } from '../../../utils/constants';
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
    this.props.getListByPage(this.props.currentPage - 1);
  };

  getNextPage = () => {
    this.props.getListByPage(this.props.currentPage + 1);
  };

  render() {
    const { loading, errorMsg, items, curPerPage, hasNextPage, currentPage } = this.props;
    if (loading) {
      return <Loading />;
    } else if (errorMsg) {
      return <p className="error text-center mt-4">{errorMsg}</p>;
    } else {
      const emptyTip = (
        <EmptyTip text={gettext('No users')}>
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

Content.propTypes = {
  resetPerPage: PropTypes.func,
  getListByPage: PropTypes.func.isRequired,
  loading: PropTypes.bool.isRequired,
  errorMsg: PropTypes.string.isRequired,
  items: PropTypes.array.isRequired,
  currentPage: PropTypes.number,
  curPerPage: PropTypes.number,
  hasNextPage: PropTypes.bool,
};

class Item extends Component {
  render() {
    const { item } = this.props;
    return (
      <Fragment>
        <tr>
          <td><UserLink email={item.email} name={item.email} /></td>
          <td>
            {`${Utils.bytesToSize(item.quota_usage)} / ${item.quota_total > 0 ? Utils.bytesToSize(item.quota_total) : '--'}`}
          </td>
          <td>
            {item.last_login ? dayjs(item.last_login).fromNow() : '--'}
          </td>
        </tr>
      </Fragment>
    );
  }
}

Item.propTypes = {
  item: PropTypes.object.isRequired,
};

class Users extends Component {

  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: '',
      userList: {},
      hasNextPage: false,
      currentPage: 1,
      perPage: 100
    };
  }

  componentDidMount() {
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
    systemAdminAPI.sysAdminListLDAPUsers(page, perPage).then(res => {
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
  };

  resetPerPage = (perPage) => {
    this.setState({
      perPage: perPage
    }, () => {
      this.getUsersListByPage(1);
    });
  };

  render() {
    return (
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
    );
  }
}

Users.propTypes = {
  email: PropTypes.string,
};

export default Users;
