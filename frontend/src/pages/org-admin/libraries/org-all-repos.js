import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { Dropdown, DropdownToggle, DropdownMenu, DropdownItem } from 'reactstrap';
import { Utils } from '../../../utils/utils';
import { orgAdminAPI } from '../../../utils/org-admin-api';
import { gettext, siteRoot, orgID } from '../../../utils/constants';
import toaster from '../../../components/toast/index';
import EmptyTip from '../../../components/empty-tip';
import Loading from '../../../components/loading';
import Paginator from '../../../components/paginator';
import ModalPortal from '../../../components/modal-portal';
import TransferDialog from '../../../components/dialog/transfer-dialog';
import { navigate } from '@gatsbyjs/reach-router';
import OrgAdminRepo from '../../../models/org-admin-repo';
import MainPanelTopbar from '../main-panel-topbar';
import ReposNav from './org-repo-nav';


class Content extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isItemFreezed: false
    };
  }

  onFreezedItem = () => {
    this.setState({ isItemFreezed: true });
  };

  onUnfreezedItem = () => {
    this.setState({ isItemFreezed: false });
  };

  getPreviousPageList = () => {
    this.props.getListByPage(this.props.pageInfo.current_page - 1);
  };

  getNextPageList = () => {
    this.props.getListByPage(this.props.pageInfo.current_page + 1);
  };

  sortByFileCount = (e) => {
    e.preventDefault();
    this.props.sortItems('file_count');
  };

  sortBySize = (e) => {
    e.preventDefault();
    this.props.sortItems('size');
  };

  render() {
    // offer 'sort' only for 'all repos'
    const { loading, errorMsg, items, pageInfo, curPerPage, sortBy } = this.props;
    if (loading) {
      return <Loading />;
    } else if (errorMsg) {
      return <p className="error text-center">{errorMsg}</p>;
    } else {
      const emptyTip = (
        <EmptyTip text={gettext('No libraries')}/>
      );
      const initialSortIcon = <span className="sf3-font sf3-font-sort3"></span>;
      const sortIcon = <span className="sf3-font sf3-font-down"></span>;
      const table = (
        <Fragment>
          <table>
            <thead>
              <tr>
                <th width="5%">{/* icon*/}</th>
                <th width="25%">{gettext('Name')}</th>
                <th width="15%">
                  {sortBy != undefined ?
                    <Fragment>
                      <a className="d-inline-block table-sort-op" href="#" onClick={this.sortByFileCount}>{gettext('Files')} {sortBy == 'file_count' ? sortIcon : initialSortIcon}</a>{' / '}
                      <a className="d-inline-block table-sort-op" href="#" onClick={this.sortBySize}>{gettext('Size')} {sortBy == 'size' ? sortIcon : initialSortIcon}</a>
                    </Fragment> :
                    gettext('Files') / gettext('Size')
                  }
                </th>
                <th width="32%">ID</th>
                <th width="18%">{gettext('Owner')}</th>
                <th width="5%">{/* Operations*/}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                return (<RepoItem
                  key={index}
                  repo={item}
                  isItemFreezed={this.state.isItemFreezed}
                  onFreezedItem={this.onFreezedItem}
                  onUnfreezedItem={this.onUnfreezedItem}
                  onDeleteRepo={this.props.onDeleteRepo}
                  transferRepoItem={this.props.transferRepoItem}
                />);
              })}
            </tbody>
          </table>
          {pageInfo &&
            <Paginator
              gotoPreviousPage={this.getPreviousPageList}
              gotoNextPage={this.getNextPageList}
              currentPage={pageInfo.current_page}
              hasNextPage={pageInfo.has_next_page}
              curPerPage={curPerPage}
              resetPerPage={this.props.resetPerPage}
            />
          }
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
  deleteItem: PropTypes.func,
  onDeleteRepo: PropTypes.func.isRequired,
  onRestoreRepo: PropTypes.func,
  getListByPage: PropTypes.func.isRequired,
  resetPerPage: PropTypes.func,
  pageInfo: PropTypes.object,
  curPerPage: PropTypes.number,
  sortItems: PropTypes.func,
  sortBy: PropTypes.string,
  transferRepoItem: PropTypes.func.isRequired,
};

const propTypes = {
  repo: PropTypes.object.isRequired,
  isItemFreezed: PropTypes.bool,
  onFreezedItem: PropTypes.func.isRequired,
  onUnfreezedItem: PropTypes.func.isRequired,
  onDeleteRepo: PropTypes.func.isRequired,
  transferRepoItem: PropTypes.func.isRequired,
};

class RepoItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      highlight: false,
      showMenu: false,
      isItemMenuShow: false,
      isTransferDialogShow: false,
    };
  }

  onMouseEnter = () => {
    if (!this.props.isItemFreezed) {
      this.setState({
        showMenu: true,
        highlight: true,
      });
    }
  };

  onMouseLeave = () => {
    if (!this.props.isItemFreezed) {
      this.setState({
        showMenu: false,
        highlight: false
      });
    }
  };

  onDropdownToggleClick = (e) => {
    e.preventDefault();
    this.toggleOperationMenu(e);
  };

  toggleOperationMenu = (e) => {
    e.stopPropagation();
    this.setState(
      { isItemMenuShow: !this.state.isItemMenuShow }, () => {
        if (this.state.isItemMenuShow) {
          this.props.onFreezedItem();
        } else {
          this.setState({
            highlight: false,
            showMenu: false,
          });
          this.props.onUnfreezedItem();
        }
      }
    );
  };

  toggleDelete = () => {
    this.props.onDeleteRepo(this.props.repo);
  };

  renderRepoOwnerHref = (repo) => {
    let href;
    if (repo.isDepartmentRepo) {
      href = siteRoot + 'org/groupadmin/' + repo.groupID + '/';
    } else {
      href = siteRoot + 'org/useradmin/info/' + repo.ownerEmail + '/';
    }
    return href;
  };

  toggleTransfer = () => {
    this.setState({ isTransferDialogShow: !this.state.isTransferDialogShow });
  };

  onTransferRepo = (email, reshare) => {
    let repo = this.props.repo;
    orgAdminAPI.orgAdminTransferOrgRepo(orgID, repo.repoID, email, reshare).then(res => {
      const { owner_name, owner_email } = res.data;
      this.props.transferRepoItem(repo.repoID, owner_name, owner_email);
      let msg = gettext('Successfully transferred the library.');
      toaster.success(msg);
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
    this.toggleTransfer();
  };

  render() {
    let { repo } = this.props;
    let isOperationMenuShow = this.state.showMenu;
    let iconTitle = repo.encrypted ? gettext('Encrypted library') : gettext('Read-Write library');
    return (
      <Fragment>
        <tr className={this.state.highlight ? 'tr-highlight' : ''} onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave}>
          <td>
            <img src={Utils.getLibIconUrl(repo)} title={iconTitle} alt={iconTitle} width="24" />
          </td>
          <td>{repo.repoName}</td>
          <td>{`${repo.file_count} / ${Utils.bytesToSize(repo.size)}`}</td>
          <td>{repo.repoID}</td>
          <td><a href={this.renderRepoOwnerHref(repo)}>{repo.ownerName}</a></td>
          <td className="text-center cursor-pointer">
            {isOperationMenuShow &&
            <Dropdown isOpen={this.state.isItemMenuShow} toggle={this.toggleOperationMenu}>
              <DropdownToggle
                tag="a"
                className="attr-action-icon sf3-font sf3-font-more-vertical"
                title={gettext('More operations')}
                aria-label={gettext('More operations')}
                data-toggle="dropdown"
                aria-expanded={this.state.isItemMenuShow}
                onClick={this.onDropdownToggleClick}
              />
              <DropdownMenu>
                <DropdownItem onClick={this.toggleDelete}>{gettext('Delete')}</DropdownItem>
                <DropdownItem onClick={this.toggleTransfer}>{gettext('Transfer')}</DropdownItem>
              </DropdownMenu>
            </Dropdown>
            }
          </td>
        </tr>
        {this.state.isTransferDialogShow && (
          <ModalPortal>
            <TransferDialog
              itemName={repo.repoName}
              onTransferRepo={this.onTransferRepo}
              toggleDialog={this.toggleTransfer}
              isOrgAdmin={true}
            />
          </ModalPortal>
        )}
      </Fragment>
    );
  }
}

RepoItem.propTypes = propTypes;

class OrgAllRepos extends Component {

  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: '',
      repos: [],
      pageInfo: {},
      perPage: 100,
      sortBy: '',
    };
  }

  componentDidMount() {
    let urlParams = (new URL(window.location)).searchParams;
    const { currentPage = 1, perPage, sortBy } = this.state;
    this.setState({
      sortBy: urlParams.get('order_by') || sortBy,
      perPage: parseInt(urlParams.get('per_page') || perPage),
      currentPage: parseInt(urlParams.get('page') || currentPage)
    }, () => {
      this.getReposByPage(this.state.currentPage);
    });
  }

  getReposByPage = (page) => {
    let { perPage } = this.state;
    orgAdminAPI.orgAdminListOrgRepos(orgID, page, perPage, this.state.sortBy).then((res) => {
      let orgRepos = res.data.repo_list.map(item => {
        return new OrgAdminRepo(item);
      });
      let page_info = {};
      if (res.data.page_info === undefined) {
        let page = res.data.page;
        let has_next_page = res.data.page_next;
        page_info = {
          'current_page': page,
          'has_next_page': has_next_page
        };
      } else {
        page_info = res.data.page_info;
      }
      this.setState({
        loading: false,
        repos: orgRepos,
        pageInfo: page_info
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
      sortBy: sortBy
    }, () => {
      let url = new URL(location.href);
      let searchParams = new URLSearchParams(url.search);
      const { currentPage, sortBy } = this.state;
      searchParams.set('page', currentPage);
      searchParams.set('order_by', sortBy);
      url.search = searchParams.toString();
      navigate(url.toString());
      this.getReposByPage(currentPage);
    });
  };

  resetPerPage = (perPage) => {
    this.setState({
      perPage: perPage
    }, () => {
      this.getReposByPage(1);
    });
  };


  deleteRepoItem = (repo) => {
    orgAdminAPI.orgAdminDeleteOrgRepo(orgID, repo.repoID).then(res => {
      this.setState({
        repos: this.state.repos.filter(item => item.repoID !== repo.repoID)
      });
      let msg = gettext('Successfully deleted {name}');
      msg = msg.replace('{name}', repo.repoName);
      toaster.success(msg);
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  transferRepoItem = (repoID, ownerName, ownerEmail) => {
    this.setState({
      repos: this.state.repos.map(item => {
        if (item.repoID == repoID) {
          item.ownerEmail = ownerEmail;
          item.ownerName = ownerName;
        }
        return item;
      })
    });
  };

  render() {
    return (
      <Fragment>
        <MainPanelTopbar />
        <div className="main-panel-center flex-row">
          <div className="cur-view-container">
            <ReposNav currentItem="all" />
            <div className="cur-view-content">
              <Content
                loading={this.state.loading}
                errorMsg={this.state.errorMsg}
                items={this.state.repos}
                sortBy={this.state.sortBy}
                sortItems={this.sortItems}
                pageInfo={this.state.pageInfo}
                curPerPage={this.state.perPage}
                getListByPage={this.getReposByPage}
                resetPerPage={this.resetPerPage}
                onDeleteRepo={this.deleteRepoItem}
                transferRepoItem={this.transferRepoItem}
              />
            </div>
          </div>
        </div>
      </Fragment>
    );
  }
}

export default OrgAllRepos;
