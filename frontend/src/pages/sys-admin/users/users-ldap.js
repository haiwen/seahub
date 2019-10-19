import React, { Component, Fragment } from 'react';
import { seafileAPI } from '../../../utils/seafile-api';
import { gettext, siteRoot } from '../../../utils/constants';
import { Utils } from '../../../utils/utils';
import EmptyTip from '../../../components/empty-tip';
import moment from 'moment';
import Loading from '../../../components/loading';
import Paginator from '../../../components/paginator';
import UsersNav from './users-nav';
import MainPanelTopbar from '../main-panel-topbar';

class Content extends Component {

  constructor(props) {
    super(props);
    this.state = {
    };
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
      return <p className="error text-center">{errorMsg}</p>;
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
                <th width="34%">{gettext('Email')}</th>
                <th width="33%">{gettext('Space Used')}{' / '}{gettext('Quota')}</th>
                <th width="33%">{gettext('Create At')}{' / '}{gettext('Last Login')}</th>
              </tr>
            </thead>
            {items && 
              <tbody>
                {items.map((item, index) => {
                  return (<Item
                    key={index}
                    item={item}
                    deleteUser={this.props.deleteUser}
                    onUserSelected={this.props.onUserSelected}
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
    this.state = {
      quota_total: this.props.item.quota_total,
    };
  }

  handleMouseOver = () => {
    this.setState({isOpIconShown: true});
  }

  handleMouseOut = () => {
    this.setState({isOpIconShown: false});
  }

  render() {
    let { status, role, quota_total, isOpIconShown } = this.state;
    let {item} = this.props;
    let iconVisibility = this.state.isOpIconShown ? '' : ' invisible'; 
    let pencilIconClassName = 'fa fa-pencil-alt attr-action-icon' + iconVisibility;

    let email = '<span class="op-target">' + Utils.HTMLescape(item.email) + '</span>';

    return (
      <Fragment>
        <tr onMouseEnter={this.handleMouseOver} onMouseLeave={this.handleMouseOut}>
          <td>
            <div><a href={siteRoot + 'sys/user-info/' + item.email + '/'}>{item.email}</a></div>
          </td>
          <td>{Utils.bytesToSize(item.quota_usage)}{' / '}
            {quota_total >= 0 ? Utils.bytesToSize(quota_total) : '--'}
          </td>
          <td>
            <div>{moment(item.create_time).format('YYYY-MM-DD HH:mm') }{' /'}</div>
            <div>{item.last_login == '' ? '--' : moment(item.last_login).fromNow()}</div>
          </td>
        </tr>
      </Fragment>
    );
  }
}

class UsersLDAP extends Component {

  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: '',
      userList: {},
      hasNextPage: false,
      currentPage: 1,
      perPage: 25,
    };
  }

  componentDidMount () {
    this.getUsersListByPage(1);   // init enter the first page
  }

  getUsersListByPage = (page) => {
    let { perPage } = this.state;
    seafileAPI.sysAdminListAllLDAPUsers(page, perPage).then(res => {
      this.setState({
        userList: res.data.ldap_user_list,
        hasNextPage: res.data.has_next_page,
        loading: false,
        currentPage: page,
      });
    }).catch((error) => {
      if (error.response) {
        if (error.response.status == 403) {
          this.setState({
            loading: false,
            errorMsg: gettext('Permission denied')
          });
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

  resetPerPage = (perPage) => {
    this.setState({
      perPage: perPage
    }, () => {
      this.getUsersListByPage(1);
    });
  }

  render() {
    //let {  } = this.state;
    return (
      <Fragment>
        <MainPanelTopbar>
        </MainPanelTopbar>
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

export default UsersLDAP;