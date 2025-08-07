import React, { Component } from 'react';
import PropTypes from 'prop-types';
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

  render() {
    const {
      loading, errorMsg, items,
      perPage, currentPage, hasNextPage
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

      const table = (
        <>
          <table className="table-hover">
            <thead>
              <tr>
                <th width="18%">{gettext('Name')}</th>
                <th width="18%">{gettext('Token')}</th>
                <th width="18%">{gettext('Owner')}</th>
                <th width="15%">{gettext('Created At')}</th>
                <th width="10%">{gettext('Visit count')}</th>
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
  getShareLinksByPage: PropTypes.func.isRequired,
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
      hasNextPage: false,
    };
    this.initPage = 1;
  }

  componentDidMount() {
    this.getShareLinksByPage(this.props.currentPage);
  }

  componentDidUpdate(prevProps, prevState) {
    const { currentPage, sortBy, sortOrder } = this.props;
    if (currentPage !== prevProps.currentPage ||
      sortBy !== prevProps.sortBy ||
      sortOrder !== prevProps.sortOrder) {
      this.getShareLinksByPage(currentPage);
    }
  }

  getShareLinksByPage = (page) => {
    const { perPage, sortBy, sortOrder } = this.props;
    systemAdminAPI.sysAdminListShareLinks(page, perPage, sortBy, sortOrder).then((res) => {
      this.setState({
        shareLinkList: res.data.share_link_list,
        loading: false,
        hasNextPage: Utils.hasNextPage(page, perPage, res.data.count),
      });
    }).catch((error) => {
      this.setState({
        loading: false,
        errorMsg: Utils.getErrorMsg(error, true) // true: show login tip if 403
      });
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
    this.props.onResetPerPage(newPerPage, () => { this.getShareLinksByPage(this.initPage); });
  };

  render() {
    let { shareLinkList, currentPage, perPage, hasNextPage } = this.state;
    return (
      <>
        <div className="main-panel-center flex-row">
          <div className="cur-view-container">
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
                deleteShareLink={this.deleteShareLink}
              />
            </div>
          </div>
        </div>
      </>
    );
  }
}

export default ShareLinks;
