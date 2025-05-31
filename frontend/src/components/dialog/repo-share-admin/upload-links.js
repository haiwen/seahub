import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import dayjs from 'dayjs';
import classnames from 'classnames';
import { Link } from '@gatsbyjs/reach-router';
import { Utils } from '../../../utils/utils';
import { seafileAPI } from '../../../utils/seafile-api';
import { repoShareAdminAPI } from '../../../utils/repo-share-admin-api';
import { gettext, siteRoot } from '../../../utils/constants';
import Loading from '../../loading';
import toaster from '../../../components/toast';
import EmptyTip from '../../../components/empty-tip';
import CommonOperationConfirmationDialog from '../../../components/dialog/common-operation-confirmation-dialog';

const itemPropTypes = {
  item: PropTypes.object.isRequired,
  deleteItem: PropTypes.func.isRequired,
  toggleSelectLink: PropTypes.func.isRequired
};

class Item extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isHighlighted: false,
      isOperationShow: false
    };
  }

  onMouseEnter = () => {
    this.setState({
      isHighlighted: true,
      isOperationShow: true
    });
  };

  onMouseLeave = () => {
    this.setState({
      isHighlighted: false,
      isOperationShow: false
    });
  };

  onDeleteLink = () => {
    this.props.deleteItem(this.props.item);
  };

  cutLink = (link) => {
    let length = link.length;
    return link.slice(0, 9) + '...' + link.slice(length - 5);
  };

  toggleSelectLink = (e) => {
    const { item } = this.props;
    this.props.toggleSelectLink(item, e.target.checked);
  };

  render() {
    const { isHighlighted } = this.state;
    let item = this.props.item;
    let path = item.path === '/' ? '/' : item.path.slice(0, item.path.length - 1);
    let objUrl = `${siteRoot}library/${item.repo_id}/${encodeURIComponent(item.repo_name)}${Utils.encodePath(path)}`;

    return (
      <tr
        onMouseEnter={this.onMouseEnter}
        onMouseLeave={this.onMouseLeave}
        onFocus={this.onMouseEnter}
        className={classnames({
          'tr-highlight': isHighlighted,
          'tr-active': item.isSelected
        })}
      >
        <td className="text-center">
          <input
            type="checkbox"
            checked={item.isSelected || false}
            className="vam"
            onChange={this.toggleSelectLink}
          />
        </td>
        <td>
          <img src={item.creator_avatar} alt={item.creator_name} width="24" className="rounded-circle mr-2" />
          <a href={`${siteRoot}profile/${encodeURIComponent(item.creator_email)}/`} target="_blank" className="align-middle" rel="noreferrer">{item.creator_name}</a>
        </td>
        <td>
          <Link to={objUrl}>{item.obj_name}</Link>
        </td>
        <td>
          <a href={item.link} target="_blank" rel="noreferrer">
            {this.cutLink(item.link)}
          </a>
        </td>
        <td>
          {item.expire_date ? dayjs(item.expire_date).format('YYYY-MM-DD HH:mm') : '--'}
        </td>
        <td>{item.view_cnt}</td>
        <td>
          <i
            tabIndex="0"
            role="button"
            className={`sf3-font-delete1 sf3-font op-icon ${this.state.isOperationShow ? '' : 'invisible'}`}
            onClick={this.onDeleteLink}
            onKeyDown={Utils.onKeyDown}
            title={gettext('Delete')}
            aria-label={gettext('Delete')}
          >
          </i>
        </td>
      </tr>
    );
  }
}

Item.propTypes = itemPropTypes;

const propTypes = {
  repo: PropTypes.object.isRequired,
};

const PER_PAGE = 25;

class RepoShareAdminUploadLinks extends Component {

  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      hasMore: false,
      isLoadingMore: false,
      page: 1,
      errorMsg: '',
      items: [],
      isDeleteUploadLinksDialogOpen: false
    };
  }

  componentDidMount() {
    const { repo } = this.props;
    const { page } = this.state;
    repoShareAdminAPI.listRepoUploadLinks(repo.repo_id, page).then((res) => {
      this.setState({
        loading: false,
        hasMore: res.data.length == PER_PAGE,
        items: res.data,
      });
    }).catch((error) => {
      this.setState({
        loading: false,
        errorMsg: Utils.getErrorMsg(error, true) // true: show login tip if 403
      });
    });
  }

  deleteItem = (item) => {
    seafileAPI.deleteRepoUploadLink(this.props.repo.repo_id, item.token).then(() => {
      let items = this.state.items.filter(linkItem => {
        return linkItem.token !== item.token;
      });
      this.setState({ items: items });
      let message = gettext('Successfully deleted 1 item');
      toaster.success(message);
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  toggleDeleteUploadLinksDialog = () => {
    this.setState({ isDeleteUploadLinksDialogOpen: !this.state.isDeleteUploadLinksDialogOpen });
  };

  toggleSelectAllLinks = (e) => {
    this._toggleSelectAllLinks(e.target.checked);
  };

  cancelSelectAllLinks = () => {
    this._toggleSelectAllLinks(false);
  };

  _toggleSelectAllLinks = (isSelected) => {
    const { items: links } = this.state;
    this.setState({
      items: links.map(item => {
        item.isSelected = isSelected;
        return item;
      })
    });
  };

  toggleSelectLink = (link, isSelected) => {
    const { items: links } = this.state;
    this.setState({
      items: links.map(item => {
        if (item.token == link.token) {
          item.isSelected = isSelected;
        }
        return item;
      })
    });
  };

  deleteUploadLinks = () => {
    const { items } = this.state;
    const tokens = items.filter(item => item.isSelected).map(link => link.token);
    repoShareAdminAPI.deleteUploadLinks(tokens).then(res => {
      const { success, failed } = res.data;
      if (success.length) {
        let newLinkList = items.filter(link => {
          return !success.some(deletedLink => {
            return deletedLink.token == link.token;
          });
        });
        this.setState({
          items: newLinkList
        });
        const length = success.length;
        const msg = length == 1 ?
          gettext('Successfully deleted 1 upload link') :
          gettext('Successfully deleted {number_placeholder} upload links')
            .replace('{number_placeholder}', length);
        toaster.success(msg);
      }
      failed.forEach(item => {
        const msg = `${item.token}: ${item.error_msg}`;
        toaster.danger(msg);
      });
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  getTheadContent = (withCheckbox, isAllLinksSelected) => {
    return (
      <tr>
        <th width="5%" className="text-center">
          {withCheckbox && <input type="checkbox" checked={isAllLinksSelected} className="vam" onChange={this.toggleSelectAllLinks} />}
        </th>
        <th width="20%">{gettext('Creator')}</th>
        <th width="22%">{gettext('Name')}</th>
        <th width="20%">{gettext('Link')}</th>
        <th width="20%">{gettext('Expiration')}</th>
        <th width="8%">{gettext('Visits')}</th>
        <th width="5%"></th>
      </tr>
    );
  };

  handleScroll = (event) => {
    if (!this.state.isLoadingMore && this.state.hasMore) {
      const clientHeight = event.target.clientHeight;
      const scrollHeight = event.target.scrollHeight;
      const scrollTop = event.target.scrollTop;
      const isBottom = (clientHeight + scrollTop + 1 >= scrollHeight);
      if (isBottom) { // scroll to the bottom
        this.setState({ isLoadingMore: true }, () => {
          this.getMore();
        });
      }
    }
  };

  getMore = () => {
    const { page, items } = this.state;
    const { repo } = this.props;

    repoShareAdminAPI.listRepoUploadLinks(repo.repo_id, page + 1).then((res) => {
      this.setState({
        isLoadingMore: false,
        hasMore: res.data.length == PER_PAGE,
        page: page + 1,
        items: items.concat(res.data)
      });
    }).catch(error => {
      this.setState({
        isLoadingMore: false
      });
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  render() {
    const { loading, isLoadingMore, errorMsg, items, isDeleteUploadLinksDialogOpen } = this.state;
    const selectedLinks = items.filter(item => item.isSelected);
    const isAllLinksSelected = items.length == selectedLinks.length;
    return (
      <Fragment>
        <div className="d-flex justify-content-between align-items-center pb-2 mt-1 pr-1 border-bottom">
          <h6 className="font-weight-normal m-0">{gettext('Upload Links')}</h6>
          <div className="d-flex">
            {selectedLinks.length > 0 && (
              <>
                <button className="btn btn-sm btn-secondary mr-2" onClick={this.cancelSelectAllLinks}>{gettext('Cancel')}</button>
                <button className="btn btn-sm btn-secondary mr-2" onClick={this.toggleDeleteUploadLinksDialog}>{gettext('Delete')}</button>
              </>
            )}
          </div>
        </div>
        {loading && <Loading />}
        {!loading && errorMsg && <p className="error text-center mt-8">{errorMsg}</p>}
        {!loading && !errorMsg && !items.length &&
        <EmptyTip text={gettext('No upload links')}/>
        }
        {!loading && !errorMsg && items.length > 0 && (
          <>
            <table>
              <thead>{this.getTheadContent(true, isAllLinksSelected)}</thead>
              <tbody></tbody>
            </table>
            <div className='table-real-container' onScroll={this.handleScroll}>
              <table className="table-hover table-thead-hidden">
                <thead>{this.getTheadContent(false)}</thead>
                <tbody>
                  {items.map((item, index) => {
                    return (
                      <Item
                        key={index}
                        item={item}
                        deleteItem={this.deleteItem}
                        toggleSelectLink={this.toggleSelectLink}
                      />
                    );
                  })}
                </tbody>
              </table>
              {isLoadingMore && <Loading />}
            </div>
          </>
        )}
        {isDeleteUploadLinksDialogOpen && (
          <CommonOperationConfirmationDialog
            title={gettext('Delete upload links')}
            message={gettext('Are you sure you want to delete the selected upload link(s) ?')}
            executeOperation={this.deleteUploadLinks}
            confirmBtnText={gettext('Delete')}
            toggleDialog={this.toggleDeleteUploadLinksDialog}
          />
        )}
      </Fragment>
    );
  }
}

RepoShareAdminUploadLinks.propTypes = propTypes;

export default RepoShareAdminUploadLinks;
