import React, { Component, Fragment } from 'react';
import { navigate } from '@gatsbyjs/reach-router';
import { seafileAPI } from '../../../utils/seafile-api';
import { gettext, siteRoot } from '../../../utils/constants';
import toaster from '../../../components/toast';
import { Utils } from '../../../utils/utils';
import EmptyTip from '../../../components/empty-tip';
import moment from 'moment';
import Loading from '../../../components/loading';
import Paginator from '../../../components/paginator';
import LinksNav from './links-nav';
import MainPanelTopbar from '../main-panel-topbar';
import UserLink from '../user-link';

class Content extends Component {

  constructor(props) {
    super(props);
  }

  getPreviousPage = () => {
    this.props.getShareLinksByPage(this.props.currentPage - 1);
  }

  getNextPage = () => {
    this.props.getShareLinksByPage(this.props.currentPage + 1);
  }

  sortByTime = (e) => {
    e.preventDefault();
    this.props.sortItems('ctime');
  }

  sortByCount = (e) => {
    e.preventDefault();
    this.props.sortItems('view_cnt');
  }

  render() {
    const {
      loading, errorMsg, items,
      perPage, currentPage, hasNextPage,
      sortBy, sortOrder
    } = this.props;
    if (loading) {
      return <Loading />;
    } else if (errorMsg) {
      return <p className="error text-center">{errorMsg}</p>;
    } else {
      const emptyTip = (
        <EmptyTip>
          <h2>{gettext('No share links')}</h2>
        </EmptyTip>
      );

      const initialSortIcon = <span className="fas fa-sort"></span>;
      const sortIcon = <span className={`fas ${sortOrder == 'asc' ? 'fa-caret-up' : 'fa-caret-down'}`}></span>;
      const table = (
        <Fragment>
          <table className="table-hover">
            <thead>
              <tr>
                <th width="18%">{gettext('Name')}</th>
                <th width="18%">{gettext('Token')}</th>
                <th width="18%">{gettext('Owner')}</th>
                <th width="15%">
                  <a className="d-inline-block table-sort-op" href="#" onClick={this.sortByTime}>{gettext('Created At')} {sortBy == 'ctime' ? sortIcon : initialSortIcon}</a>
                </th>
                <th width="10%">
                  <a className="d-inline-block table-sort-op" href="#" onClick={this.sortByCount}>{gettext('Count')} {sortBy == 'view_cnt' ? sortIcon : initialSortIcon}</a>
                </th>
                <th width="11%">{gettext('Expiration')}</th>
                <th width="10%">{/*Operations*/}</th>
              </tr>
            </thead>
            {items &&
              <tbody>
                {items.map((item, index) => {
                  return (<Item
                    key={index}
                    item={item}
                    deleteShareLink={this.props.deleteShareLink}
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

  deleteShareLink = () => {
    this.props.deleteShareLink(this.props.item.token);
  }

  renderExpiration = () => {
    const item = this.props.item;
    if (!item.expire_date) {
      return '--';
    }
    const expire_date = moment(item.expire_date).format('YYYY-MM-DD');
    const expire_time = moment(item.expire_date).format('YYYY-MM-DD HH:mm:ss');
    return (<span className={item.is_expired ? 'error' : ''} title={expire_time}>{expire_date}</span>);
  }

  render() {
    let { isOpIconShown } = this.state;
    let { item } = this.props;
    let deleteIcon = `action-icon sf2-icon-delete ${isOpIconShown ? '' : 'invisible'}`;
    return (
      <tr onMouseOver={this.handleMouseOver} onMouseOut={this.handleMouseOut}>
        <td>{item.obj_name}</td>
        <td>{item.token}</td>
        <td><UserLink email={item.creator_email} name={item.creator_name} /></td>
        <td>{moment(item.ctime).fromNow()}</td>
        <td>{item.view_cnt}</td>
        <td>{this.renderExpiration()}</td>
        <td>
          <a href="#" className={deleteIcon} title={gettext('Remove')} onClick={this.deleteShareLink}></a>
        </td>
      </tr>
    );
  }
}

class ShareLinks extends Component {

  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: '',
      shareLinkList: [],
      perPage: 25,
      currentPage: 1,
      hasNextPage: false,
      sortBy: '',
      sortOrder: 'asc'
    };
    this.initPage = 1;
  }

  componentDidMount () {
    let urlParams = (new URL(window.location)).searchParams;
    const { currentPage, perPage, sortBy, sortOrder } = this.state;
    this.setState({
      perPage: parseInt(urlParams.get('per_page') || perPage),
      currentPage: parseInt(urlParams.get('page') || currentPage),
      sortBy: urlParams.get('order_by') || sortBy,
      sortOrder: urlParams.get('direction') || sortOrder
    }, () => {
      this.getShareLinksByPage(this.state.currentPage);
    });
  }

  getShareLinksByPage = (page) => {
    const { perPage, sortBy, sortOrder } = this.state;
    seafileAPI.sysAdminListShareLinks(page, perPage, sortBy, sortOrder).then((res) => {
      this.setState({
        shareLinkList: res.data.share_link_list,
        loading: false,
        currentPage: page,
        hasNextPage: Utils.hasNextPage(page, perPage, res.data.count),
      });
    }).catch((error) => {
      this.setState({
        loading: false,
        errorMsg: Utils.getErrorMsg(error, true) // true: show login tip if 403
      });
    });
  }

  sortItems = (sortBy) => {
    this.setState({
      currentPage: 1,
      sortBy: sortBy,
      sortOrder: this.state.sortOrder == 'asc' ? 'desc' : 'asc'
    }, () => {
      let url = new URL(location.href);
      let searchParams = new URLSearchParams(url.search);
      const { currentPage, sortBy, sortOrder } = this.state;
      searchParams.set('page', currentPage);
      searchParams.set('order_by', sortBy);
      searchParams.set('direction', sortOrder);
      url.search = searchParams.toString();
      navigate(url.toString());
      this.getShareLinksByPage(currentPage);
    });
  }

  deleteShareLink = (linkToken) => {
    seafileAPI.sysAdminDeleteShareLink(linkToken).then(res => {
      let newShareLinkList = this.state.shareLinkList.filter(item =>
        item.token != linkToken
      );
      this.setState({shareLinkList: newShareLinkList});
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  resetPerPage = (newPerPage) => {
    this.setState({
      perPage: newPerPage,
    }, () => this.getShareLinksByPage(this.initPage));
  }

  render() {
    let { shareLinkList, currentPage, perPage, hasNextPage } = this.state;
    return (
      <Fragment>
        <MainPanelTopbar {...this.props} />  
        <div className="main-panel-center flex-row">
          <div className="cur-view-container">
            <LinksNav currentItem="shareLinks" />
            <div className="cur-view-content">
              <Content
                loading={this.state.loading}
                errorMsg={this.state.errorMsg}
                items={shareLinkList}
                currentPage={currentPage}
                perPage={perPage}
                hasNextPage={hasNextPage}
                getShareLinksByPage={this.getShareLinksByPage}
                resetPerPage={this.resetPerPage}
                sortBy={this.state.sortBy}
                sortOrder={this.state.sortOrder}
                sortItems={this.sortItems}
                deleteShareLink={this.deleteShareLink}
              />
            </div>
          </div>
        </div>
      </Fragment>
    );
  }
}

export default ShareLinks;
