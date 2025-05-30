import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { navigate } from '@gatsbyjs/reach-router';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import classnames from 'classnames';
import { systemAdminAPI } from '../../../utils/system-admin-api';
import { gettext } from '../../../utils/constants';
import toaster from '../../../components/toast';
import { Utils } from '../../../utils/utils';
import EmptyTip from '../../../components/empty-tip';
import Loading from '../../../components/loading';
import Paginator from '../../../components/paginator';
import LinksNav from './links-nav';
import MainPanelTopbar from '../main-panel-topbar';
import UserLink from '../user-link';

dayjs.extend(relativeTime);

class Content extends Component {

  constructor(props) {
    super(props);
  }

  getPreviousPage = () => {
    this.props.getShareLinksByPage(this.props.currentPage - 1);
  };

  getNextPage = () => {
    this.props.getShareLinksByPage(this.props.currentPage + 1);
  };

  sortByTime = (e) => {
    e.preventDefault();
    this.props.sortItems('ctime');
  };

  sortByCount = (e) => {
    e.preventDefault();
    this.props.sortItems('view_cnt');
  };

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
        <EmptyTip text={gettext('No share links')}>
        </EmptyTip>
      );

      const initialSortIcon = <span className="sf3-font sf3-font-sort3"></span>;
      const sortIcon = <span className={`sf3-font ${sortOrder == 'asc' ? 'sf3-font-down rotate-180 d-inline-block' : 'sf3-font-down'}`}></span>;
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
                  <a className="d-inline-block table-sort-op" href="#" onClick={this.sortByCount}>{gettext('Visit count')} {sortBy == 'view_cnt' ? sortIcon : initialSortIcon}</a>
                </th>
                <th width="11%">{gettext('Expiration')}</th>
                <th width="10%">{/* Operations*/}</th>
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
  getShareLinksByPage: PropTypes.func.isRequired,
  sortItems: PropTypes.func.isRequired,
  sortBy: PropTypes.string.isRequired,
  sortOrder: PropTypes.string.isRequired,
  deleteShareLink: PropTypes.func.isRequired,
};

class Item extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isHighlighted: false,
      isOpIconShown: false,
    };
  }

  handleMouseOver = () => {
    this.setState({
      isHighlighted: true,
      isOpIconShown: true
    });
  };

  handleMouseOut = () => {
    this.setState({
      isHighlighted: false,
      isOpIconShown: false
    });
  };

  deleteShareLink = () => {
    this.props.deleteShareLink(this.props.item.token);
  };

  renderExpiration = () => {
    const item = this.props.item;
    if (!item.expire_date) {
      return '--';
    }
    const expire_date = dayjs(item.expire_date).format('YYYY-MM-DD');
    const expire_time = dayjs(item.expire_date).format('YYYY-MM-DD HH:mm:ss');
    return (<span className={item.is_expired ? 'error' : ''} title={expire_time}>{expire_date}</span>);
  };

  render() {
    let { isOpIconShown, isHighlighted } = this.state;
    let { item } = this.props;
    return (
      <tr
        className={classnames({
          'tr-highlight': isHighlighted
        })}
        onMouseOver={this.handleMouseOver}
        onMouseOut={this.handleMouseOut}
      >
        <td>{item.obj_name}</td>
        <td>{item.token}</td>
        <td><UserLink email={item.creator_email} name={item.creator_name} /></td>
        <td>{dayjs(item.ctime).fromNow()}</td>
        <td>{item.view_cnt}</td>
        <td>{this.renderExpiration()}</td>
        <td>
          <i
            className={`op-icon sf3-font-delete1 sf3-font ${isOpIconShown ? '' : 'invisible'}`}
            title={gettext('Remove')}
            onClick={this.deleteShareLink}
          >
          </i>
        </td>
      </tr>
    );
  }
}


Item.propTypes = {
  item: PropTypes.object.isRequired,
  deleteShareLink: PropTypes.func.isRequired,
};

class ShareLinks extends Component {

  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: '',
      shareLinkList: [],
      perPage: 100,
      currentPage: 1,
      hasNextPage: false,
      sortBy: '',
      sortOrder: 'asc'
    };
    this.initPage = 1;
  }

  componentDidMount() {
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
    systemAdminAPI.sysAdminListShareLinks(page, perPage, sortBy, sortOrder).then((res) => {
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
  };

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
  };

  deleteShareLink = (linkToken) => {
    systemAdminAPI.sysAdminDeleteShareLink(linkToken).then(res => {
      let newShareLinkList = this.state.shareLinkList.filter(item =>
        item.token != linkToken
      );
      this.setState({ shareLinkList: newShareLinkList });
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  resetPerPage = (newPerPage) => {
    this.setState({
      perPage: newPerPage,
    }, () => this.getShareLinksByPage(this.initPage));
  };

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
