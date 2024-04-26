import React, { Fragment, Component } from 'react';
import { navigate, Link } from '@gatsbyjs/reach-router';
import PropTypes from 'prop-types';
import { Dropdown, DropdownToggle, DropdownMenu, DropdownItem, Button } from 'reactstrap';
import MainPanelTopbar from './main-panel-topbar';
import OrgAdminRepo from '../../models/org-admin-repo';
import toaster from '../../components/toast';
import TransferDialog from '../../components/dialog/transfer-dialog';
import ModalPortal from '../../components/modal-portal';
import EmptyTip from '../../components/empty-tip';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import { mediaUrl, siteRoot, gettext, orgID } from '../../utils/constants';
import CommonOperationConfirmationDialog from '../../components/dialog/common-operation-confirmation-dialog';
import OpMenu from '../../components/dialog/op-menu';
import UserLink from './user-link';
import moment from 'moment';

class Item extends Component {

  constructor(props) {
    super(props);
    this.state = {
      highlight: false,
      isOpIconShown: false,
      isDeleteRepoDialogOpen: false,
      isRestoreRepoDialogOpen: false
    };
  }

  handleMouseOver = () => {
    if (!this.props.isItemFreezed) {
      this.setState({
        isOpIconShown: true,
        highlight: true
      });
    }
  };

  handleMouseOut = () => {
    if (!this.props.isItemFreezed) {
      this.setState({
        isOpIconShown: false,
        highlight: false
      });
    }
  };

  onUnfreezedItem = () => {
    this.setState({
      highlight: false,
      isOpIconShow: false
    });
    this.props.onUnfreezedItem();
  };

  onDeleteRepo = () => {
    const repo = this.props.repo;
    seafileAPI.orgAdminDeleteTrashRepo(orgID, repo.id).then((res) => {
      this.props.onDeleteRepo(repo);
      const msg = gettext('Successfully deleted {name}.').replace('{name}', repo.name);
      toaster.success(msg);
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  onRestoreRepo = () => {
    const repo = this.props.repo;
    seafileAPI.orgAdminRestoreTrashRepo(orgID, repo.id).then((res) => {
      this.props.onRestoreRepo(repo);
      let message = gettext('Successfully restored the library.');
      toaster.success(message);
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  toggleDeleteRepoDialog = (e) => {
    if (e) {
      e.preventDefault();
    }
    this.setState({isDeleteRepoDialogOpen: !this.state.isDeleteRepoDialogOpen});
  };

  toggleRestoreRepoDialog = (e) => {
    if (e) {
      e.preventDefault();
    }
    this.setState({isRestoreRepoDialogOpen: !this.state.isRestoreRepoDialogOpen});
  };

  translateOperations = (item) => {
    let translateResult = '';
    switch(item) {
      case 'Restore':
        translateResult = gettext('Restore');
        break;
      case 'Delete':
        translateResult = gettext('Delete');
        break;
      default:
        break;
    }

    return translateResult;
  };

  onMenuItemClick = (operation) => {
    switch(operation) {
      case 'Restore':
        this.toggleRestoreRepoDialog();
        break;
      case 'Delete':
        this.toggleDeleteRepoDialog();
        break;
      default:
        break;
    }
  };

  render () {
    const { repo } = this.props;
    const { isOpIconShown, isDeleteRepoDialogOpen, isRestoreRepoDialogOpen } = this.state;
    const iconUrl = Utils.getLibIconUrl(repo);
    const iconTitle = Utils.getLibIconTitle(repo);
    const repoName = '<span class="op-target">' + Utils.HTMLescape(repo.name) + '</span>';
    return (
      <Fragment>
        <tr onMouseEnter={this.handleMouseOver} onMouseLeave={this.handleMouseOut}>
          <td><img src={iconUrl} title={iconTitle} alt={iconTitle} width="24" /></td>
          <td>{repo.name}</td>
          <td>
            {repo.owner?.indexOf('@seafile_group') == -1 ?
              <UserLink email={repo.owner} name={repo.owner_name} /> :
              repo.group_name}
          </td>
          <td>{moment(repo.delete_time).fromNow()}</td>
          <td>
            {isOpIconShown && (
              <OpMenu
                operations={['Restore', 'Delete']}
                translateOperations={this.translateOperations}
                onMenuItemClick={this.onMenuItemClick}
                onFreezedItem={this.props.onFreezedItem}
                onUnfreezedItem={this.onUnfreezedItem}
              />
            )}
          </td>
        </tr>
        {isDeleteRepoDialogOpen &&
          <ModalPortal>
            <CommonOperationConfirmationDialog
              title={gettext('Delete Library')}
              message={gettext('Are you sure you want to delete {placeholder} completely?').replace('{placeholder}', repoName)}
              executeOperation={this.onDeleteRepo}
              confirmBtnText={gettext('Delete')}
              toggleDialog={this.toggleDeleteRepoDialog}
            />
          </ModalPortal>
        }
        {isRestoreRepoDialogOpen &&
          <ModalPortal>
            <CommonOperationConfirmationDialog
              title={gettext('Restore Library')}
              message={gettext('Are you sure you want to restore {placeholder}?').replace('{placeholder}', repoName)}
              executeOperation={this.onRestoreRepo}
              confirmBtnText={gettext('Restore')}
              toggleDialog={this.toggleRestoreRepoDialog}
            />
          </ModalPortal>
        }
      </Fragment>
    );
  }
}

Item.propTypes = {
  repo: PropTypes.object.isRequired,
  isItemFreezed: PropTypes.bool.isRequired,
  onFreezedItem: PropTypes.func.isRequired,
  onUnfreezedItem: PropTypes.func.isRequired,
  onDeleteRepo: PropTypes.func.isRequired,
  onRestoreRepo: PropTypes.func,
};


class OrgLibraries extends Component {

  constructor(props) {
    super(props);
    this.state = {
      page: 1,
      pageNext: false,
      orgRepos: [],
      sortBy: '',
      isItemFreezed: false,
      currentItem: 'all',
      isCreateRepoDialogOpen: false,
      isCleanTrashDialogOpen: false
    };
    this.navItems = [
      {name: 'all', urlPart: 'all-libraries', text: gettext('All')},
      {name: 'trash', urlPart: 'trash-libraries', text: gettext('Trash')}
    ];
  }

  componentDidMount() {
    let urlParams = (new URL(window.location)).searchParams;
    const { page, /*currentPage = 1, perPage, */sortBy } = this.state;
    this.setState({
      sortBy: urlParams.get('order_by') || sortBy,
      //perPage: parseInt(urlParams.get('per_page') || perPage),
      //currentPage: parseInt(urlParams.get('page') || currentPage)
      page: parseInt(urlParams.get('page') || page)
    }, () => {
      this.listRepos(this.state.page);
    });
  }

  listRepos = (page) => {
    seafileAPI.orgAdminListOrgRepos(orgID, page, this.state.sortBy).then(res => {
      let orgRepos = res.data.repo_list.map(item => {
        return new OrgAdminRepo(item);
      });

      this.setState({
        orgRepos: orgRepos,
        pageNext: res.data.page_next,
        page: res.data.page,
      });
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  listTrashRepos = (orgID, page) => {
    seafileAPI.orgAdminListTrashRepos(orgID, page).then(res => {
      this.setState({
        orgRepos: res.data.repos,
        pageNext: res.data.page_info.has_next_page,
        page: res.data.page_info.current_page,
      });
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  onChangePageNum = (e, num) => {
    e.preventDefault();
    let page = this.state.page;

    if (num == 1) {
      page = page + 1;
    } else {
      page = page - 1;
    }
    if (this.state.currentItem=='all') {
      this.listRepos(page);
    } else {
      this.listTrashRepos(orgID, page);
    }
  };

  onFreezedItem = () => {
    this.setState({isItemFreezed: true});
  };

  onUnfreezedItem = () => {
    this.setState({isItemFreezed: false});
  };

  deleteRepoItem = (repo) => {
    seafileAPI.orgAdminDeleteOrgRepo(orgID, repo.repoID).then(res => {
      this.setState({
        orgRepos: this.state.orgRepos.filter(item => item.repoID != repo.repoID)
      });
      let msg = gettext('Successfully deleted {name}');
      msg = msg.replace('{name}', repo.repoName);
      toaster.success(msg);
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  transferRepoItem = (repoID, user) => {
    this.setState({
      orgRepos: this.state.orgRepos.map(item =>{
        if (item.repoID == repoID) {
          item.ownerEmail = user.email;
          item.ownerName = user.value;
        }
        return item;
      })
    });
  };

  sortItems = (sortBy) => {
    this.setState({
      page: 1,
      sortBy: sortBy
    }, () => {
      let url = new URL(location.href);
      let searchParams = new URLSearchParams(url.search);
      const { page, sortBy } = this.state;
      searchParams.set('page', page);
      searchParams.set('order_by', sortBy);
      url.search = searchParams.toString();
      navigate(url.toString());
      this.listRepos(page);
    });
  };

  sortByFileCount = (e) => {
    e.preventDefault();
    this.sortItems('file_count');
  };

  sortBySize = (e) => {
    e.preventDefault();
    this.sortItems('size');
  };

  handleClick = (currentItem,itmeID, event) => {
    event.preventDefault();
    this.setState({
      currentItem: currentItem
    });
    if(currentItem == 'all'){
      this.listRepos(this.state.page);
    }
    if(currentItem == 'trash'){
      this.listTrashRepos(orgID, this.state.page);
    }
  };

  toggleCreateRepoDialog = () => {
    this.setState({isCreateRepoDialogOpen: !this.state.isCreateRepoDialogOpen});
  };

  toggleCleanTrashDialog = () => {
    this.setState({isCleanTrashDialogOpen: !this.state.isCleanTrashDialogOpen});
  };

  onDeleteRepo = (targetRepo) => {
    let repos = this.state.orgRepos.filter(repo => {
      return repo.id != targetRepo.id;
    });
    this.setState({
      orgRepos: repos
    });
  };

  onRestoreRepo = (targetRepo) => {
    let repos = this.state.orgRepos.filter(repo => {
      return repo.id != targetRepo.id;
    });
    this.setState({
      orgRepos: repos
    });
  };

  cleanTrash = () => {
    seafileAPI.orgAdminCleanTrashRepo(orgID).then(res => {
      this.setState({orgRepos: []});
      toaster.success(gettext('Successfully cleared trash.'));
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  render() {
    const { orgRepos, sortBy } = this.state;
    const initialSortIcon = <span className="fas fa-sort"></span>;
    const sortIcon = <span className="fas fa-caret-down"></span>;
    let topbarChildren;
    topbarChildren = (
      <Fragment>
        {this.state.currentItem=='trash' && <Button className="btn btn-secondary operation-item" onClick={this.toggleCleanTrashDialog}>
          <i className="fas fa-plus-square text-secondary mr-1"></i>{gettext('Clean')} </Button>
        }
      </Fragment>
    );
    return (
      <Fragment>
        <MainPanelTopbar children={topbarChildren} />
        <div className="main-panel-center flex-row">
          <div className="cur-view-container">
            <div className="cur-view-path tab-nav-container">
              <ul className="nav">
                {this.navItems.map((item, index) => {
                  return (
                    <li className="nav-item" key={index}>
                      <Link
                        to=''
                        className={`nav-link${this.state.currentItem === item.name ? ' active' : ''}`}
                        onClick={(event) => this.handleClick(item.name,item.id, event)} >{item.text}</Link>
                    </li>
                  );
                })}
              </ul>
            </div>
            {this.state.currentItem=='all' && <div className="cur-view-content">
              <table>
                <thead>
                  <tr>
                    <th width="5%">{/*icon*/}</th>
                    <th width="25%">{gettext('Name')}</th>
                    <th width="15%">
                      <a className="d-inline-block table-sort-op" href="#" onClick={this.sortByFileCount}>{gettext('Files')} {sortBy == 'file_count' ? sortIcon : initialSortIcon}</a>{' / '}
                      <a className="d-inline-block table-sort-op" href="#" onClick={this.sortBySize}>{gettext('Size')} {sortBy == 'size' ? sortIcon : initialSortIcon}</a>
                    </th>
                    <th width="32%">ID</th>
                    <th width="18%">{gettext('Owner')}</th>
                    <th width="5%">{/*Operations*/}</th>
                  </tr>
                </thead>
                <tbody>
                  {orgRepos.map(item => {
                    return (
                      <RepoItem
                        key={item.repoID}
                        repo={item}
                        isItemFreezed={this.state.isItemFreezed}
                        onFreezedItem={this.onFreezedItem}
                        onUnfreezedItem={this.onUnfreezedItem}
                        deleteRepoItem={this.deleteRepoItem}
                        transferRepoItem={this.transferRepoItem}
                      />
                    );}
                  )}
                </tbody>
              </table>
              <div className="paginator">
                {this.state.page != 1 && <a href="#" onClick={(e) => this.onChangePageNum(e, -1)}>{gettext('Previous')}</a>}
                {(this.state.page != 1 && this.state.pageNext) && <span> | </span>}
                {this.state.pageNext && <a href="#" onClick={(e) => this.onChangePageNum(e, 1)}>{gettext('Next')}</a>}
              </div>
            </div>}
            {this.state.currentItem=='trash' && this.state.orgRepos.length!=0 && <div>
              <table className="table-hover">
                <thead>
                  <tr>
                    <th width="5%">{/*icon*/}</th>
                    <th width="43%">{gettext('Name')}</th>
                    <th width="27%">{gettext('Owner')}</th>
                    <th width="20%">{gettext('Deleted Time')}</th>
                    <th width="5%">{/*Operations*/}</th>
                  </tr>
                </thead>
                <tbody>
                  {orgRepos?.map((item, index) => {
                    return (<Item
                      key={index}
                      repo={item}
                      isItemFreezed={this.state.isItemFreezed}
                      onFreezedItem={this.onFreezedItem}
                      onUnfreezedItem={this.onUnfreezedItem}
                      onDeleteRepo={this.onDeleteRepo}
                      onRestoreRepo={this.onRestoreRepo}
                    />);
                  })}
                </tbody>
              </table>
              <div className="paginator">
                {this.state.page != 1 && <a href="#" onClick={(e) => this.onChangePageNum(e, -1)}>{gettext('Previous')}</a>}
                {(this.state.page != 1 && this.state.pageNext) && <span> | </span>}
                {this.state.pageNext && <a href="#" onClick={(e) => this.onChangePageNum(e, 1)}>{gettext('Next')}</a>}
              </div>
            </div>}
            {this.state.currentItem == 'trash' && this.state.orgRepos.length == 0 && <EmptyTip>
              <h2>{gettext('No deleted libraries')}</h2>
            </EmptyTip>}
            {this.state.isCleanTrashDialogOpen && (
              <CommonOperationConfirmationDialog
                title={gettext('Clear Trash')}
                message={gettext('Are you sure you want to clear trash?')}
                executeOperation={this.cleanTrash}
                confirmBtnText={gettext('Clear')}
                toggleDialog={this.toggleCleanTrashDialog}
              />
            )
            }
          </div>
        </div>
      </Fragment>
    );
  }
}

const propTypes = {
  repo: PropTypes.object.isRequired,
  isItemFreezed: PropTypes.bool,
  onFreezedItem: PropTypes.func.isRequired,
  onUnfreezedItem: PropTypes.func.isRequired,
  deleteRepoItem: PropTypes.func.isRequired,
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
      {isItemMenuShow: !this.state.isItemMenuShow }, () => {
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
    this.props.deleteRepoItem(this.props.repo);
  };

  renderLibIcon = (repo) => {
    let href;
    let iconTitle;
    if (repo.encrypted) {
      href = mediaUrl + 'img/lib/48/lib-encrypted.png';
      iconTitle = gettext('Encrypted library');
    } else {
      href = mediaUrl + 'img/lib/48/lib.png';
      iconTitle = gettext('Read-Write library');
    }
    return <img src={href} title={iconTitle} alt={iconTitle} width="24" />;
  };

  renderRepoOwnerHref = (repo) => {
    let href;
    if (repo.isDepartmentRepo) {
      href = siteRoot + 'org/admin/#address-book/groups/' + repo.groupID + '/';
    } else {
      href = siteRoot + 'org/useradmin/info/' + repo.ownerEmail + '/';
    }
    return href;
  };

  toggleTransfer = () => {
    this.setState({isTransferDialogShow: !this.state.isTransferDialogShow});
  };

  onTransferRepo = (user) => {
    let repo = this.props.repo;
    seafileAPI.orgAdminTransferOrgRepo(orgID, repo.repoID, user.email).then(res => {
      this.props.transferRepoItem(repo.repoID, user);
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
    return (
      <Fragment>
        <tr className={this.state.highlight ? 'tr-highlight' : ''} onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave}>
          <td>{this.renderLibIcon(repo)}</td>
          <td>{repo.repoName}</td>
          <td>{`${repo.file_count} / ${Utils.bytesToSize(repo.size)}`}</td>
          <td>{repo.repoID}</td>
          <td><a href={this.renderRepoOwnerHref(repo)}>{repo.ownerName}</a></td>
          <td className="text-center cursor-pointer">
            {isOperationMenuShow &&
              <Dropdown isOpen={this.state.isItemMenuShow} toggle={this.toggleOperationMenu}>
                <DropdownToggle
                  tag="a"
                  className="attr-action-icon fas fa-ellipsis-v"
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
              submit={this.onTransferRepo}
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

export default OrgLibraries;
