import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { Dropdown, DropdownToggle, DropdownMenu, DropdownItem } from 'reactstrap';
import { Utils } from '../../utils/utils';
import { seafileAPI } from '../../utils/seafile-api';
import { gettext, siteRoot, mediaUrl, orgID } from '../../utils/constants';
import toaster from '../../components/toast';
import EmptyTip from '../../components/empty-tip';
import Loading from '../../components/loading';
import Paginator from '../../components/paginator';
import ModalPortal from '../../components/modal-portal';
import TransferDialog from '../../components/dialog/transfer-dialog';

class Content extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isItemFreezed: false
    };
  }

  onFreezedItem = () => {
    this.setState({isItemFreezed: true});
  };

  onUnfreezedItem = () => {
    this.setState({isItemFreezed: false});
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
        <EmptyTip>
          <h2>{gettext('No libraries')}</h2>
        </EmptyTip>
      );
      const initialSortIcon = <span className="fas fa-sort"></span>;
      const sortIcon = <span className="fas fa-caret-down"></span>;
      const table = (
        <Fragment>
          <table>
            <thead>
              <tr>
                <th width="5%">{/*icon*/}</th>
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
                <th width="5%">{/*Operations*/}</th>
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
    this.props.onDeleteRepo(this.props.repo);
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

export default Content;
