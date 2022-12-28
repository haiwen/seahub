import React, { Component, Fragment } from 'react';
import { Link } from '@gatsbyjs/reach-router';
import { Utils } from '../../../utils/utils';
import { seafileAPI } from '../../../utils/seafile-api';
import { gettext, siteRoot, isPro } from '../../../utils/constants';
import toaster from '../../../components/toast';
import EmptyTip from '../../../components/empty-tip';
import Loading from '../../../components/loading';
import Paginator from '../../../components/paginator';
import ModalPortal from '../../../components/modal-portal';
import OpMenu from '../../../components/dialog/op-menu';
import TransferDialog from '../../../components/dialog/transfer-dialog';
import DeleteRepoDialog from '../../../components/dialog/delete-repo-dialog';
import SysAdminShareDialog from '../../../components/dialog/sysadmin-dialog/sysadmin-share-dialog';
import SysAdminLibHistorySettingDialog from '../../../components/dialog/sysadmin-dialog/sysadmin-lib-history-setting-dialog';
import UserLink from '../user-link';

const { enableSysAdminViewRepo } = window.sysadmin.pageOptions;

class Content extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isItemFreezed: false
    };
  }

  onFreezedItem = () => {
    this.setState({isItemFreezed: true});
  }

  onUnfreezedItem = () => {
    this.setState({isItemFreezed: false});
  }

  getPreviousPageList = () => {
    this.props.getListByPage(this.props.pageInfo.current_page - 1);
  }

  getNextPageList = () => {
    this.props.getListByPage(this.props.pageInfo.current_page + 1);
  }

  sortByFileCount = (e) => {
    e.preventDefault();
    this.props.sortItems('file_count');
  }

  sortBySize = (e) => {
    e.preventDefault();
    this.props.sortItems('size');
  }

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
                return (<Item
                  key={index}
                  repo={item}
                  isItemFreezed={this.state.isItemFreezed}
                  onFreezedItem={this.onFreezedItem}
                  onUnfreezedItem={this.onUnfreezedItem}
                  onDeleteRepo={this.props.onDeleteRepo}
                  onTransferRepo={this.props.onTransferRepo}
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

class Item extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isOpIconShown: false,
      highlight: false,
      isShareDialogOpen: false,
      isDeleteDialogOpen: false,
      isTransferDialogOpen: false,
      isHistorySettingDialogOpen: false,
      isRepoDeleted: false,
    };
  }

  onDeleteRepo = (repo) => {
    seafileAPI.sysAdminDeleteRepo(repo.id).then((res) => {
      this.props.onDeleteRepo(repo);
      this.setState({
        isDeleteDialogOpen: false,
        isRepoDeleted: true,
      });
      const msg = gettext('Successfully deleted {name}.').replace('{name}', repo.name);
      toaster.success(msg);
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);

      this.setState({isRepoDeleted: false});
    });
  }

  onTransferRepo = (owner) => {
    seafileAPI.sysAdminTransferRepo(this.props.repo.id, owner.email).then((res) => {
      this.props.onTransferRepo(res.data);
      let message = gettext('Successfully transferred the library.');
      toaster.success(message);
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
    this.toggleTransferDialog();
  }

  handleMouseOver = () => {
    if (!this.props.isItemFreezed) {
      this.setState({
        isOpIconShown: true,
        highlight: true
      });
    }
  }

  handleMouseOut = () => {
    if (!this.props.isItemFreezed) {
      this.setState({
        isOpIconShown: false,
        highlight: false
      });
    }
  }

  onUnfreezedItem = () => {
    this.setState({
      highlight: false,
      isOpIconShow: false
    });
    this.props.onUnfreezedItem();
  }

  onMenuItemClick = (operation) => {
    switch(operation) {
      case 'Share':
        this.toggleShareDialog();
        break;
      case 'Delete':
        this.toggleDeleteDialog();
        break;
      case 'Transfer':
        this.toggleTransferDialog();
        break;
      case 'History Setting':
        this.toggleHistorySettingDialog();
        break;
      default:
        break;
    }
  }

  toggleShareDialog = () => {
    this.setState({isShareDialogOpen: !this.state.isShareDialogOpen});
  }

  toggleDeleteDialog = () => {
    this.setState({isDeleteDialogOpen: !this.state.isDeleteDialogOpen});
  }

  toggleTransferDialog = () => {
    this.setState({isTransferDialogOpen: !this.state.isTransferDialogOpen});
  }

  toggleHistorySettingDialog = () => {
    this.setState({isHistorySettingDialogOpen: !this.state.isHistorySettingDialogOpen});
  }

  renderRepoName = () => {
    const { repo } = this.props;
    if (repo.name) {
      if (isPro && enableSysAdminViewRepo && !repo.encrypted) {
        return <Link to={`${siteRoot}sys/libraries/${repo.id}/`}>{repo.name}</Link>;
      } else {
        return repo.name;
      }
    } else {
      return '--';
    }
  }

  translateOperations = (item) => {
    let translateResult = '';
    switch(item) {
      case 'Share':
        translateResult = gettext('Share');
        break;
      case 'Delete':
        translateResult = gettext('Delete');
        break;
      case 'Transfer':
        translateResult = gettext('Transfer');
        break;
      case 'History Setting':
        translateResult = gettext('History Setting');
        break;
      default:
        break;
    }

    return translateResult;
  }

  getOperations = () => {
    const { repo } = this.props;
    let operations = ['Delete', 'Transfer'];
    if (!repo.encrypted) {
      operations.push('Share');
    }
    operations.push('History Setting');
    return operations;
  }

  render () {
    const { repo } = this.props;
    const {
      isOpIconShown,
      isShareDialogOpen,
      isDeleteDialogOpen,
      isTransferDialogOpen,
      isHistorySettingDialogOpen
    } = this.state;
    let iconUrl = Utils.getLibIconUrl(repo);
    let iconTitle = Utils.getLibIconTitle(repo);
    const index = repo.owner_email.indexOf('@seafile_group');
    let isGroupOwnedRepo = index != -1;
    let departmentID;
    if (isGroupOwnedRepo) {
      departmentID = repo.owner_email.substring(0, index);
    }

    return (
      <Fragment>
        <tr className={this.state.highlight ? 'tr-highlight' : ''} onMouseEnter={this.handleMouseOver} onMouseLeave={this.handleMouseOut}>
          <td><img src={iconUrl} title={iconTitle} alt={iconTitle} width="24" /></td>
          <td>{this.renderRepoName()}</td>
          <td>{`${repo.file_count} / ${Utils.bytesToSize(repo.size)}`}</td>
          <td>{repo.id}</td>
          <td>
            {isGroupOwnedRepo ?
              <Link to={`${siteRoot}sys/departments/${departmentID}/`}>{repo.owner_name}</Link> :
              <UserLink email={repo.owner_email} name={repo.owner_name} />
            }
          </td>
          <td>
            {(!isGroupOwnedRepo && isOpIconShown) &&
            <OpMenu
              operations={this.getOperations()}
              translateOperations={this.translateOperations}
              onMenuItemClick={this.onMenuItemClick}
              onFreezedItem={this.props.onFreezedItem}
              onUnfreezedItem={this.onUnfreezedItem}
            />
            }
          </td>
        </tr>
        {isShareDialogOpen &&
          <ModalPortal>
            <SysAdminShareDialog
              itemName={repo.name}
              itemPath={'/'}
              repoID={repo.id}
              isGroupOwnedRepo={isGroupOwnedRepo}
              repoEncrypted={repo.encrypted}
              enableDirPrivateShare={true}
              userPerm={repo.permission}
              toggleDialog={this.toggleShareDialog}
            />
          </ModalPortal>
        }
        {isDeleteDialogOpen &&
          <ModalPortal>
            <DeleteRepoDialog
              repo={repo}
              isRepoDeleted={this.state.isRepoDeleted}
              onDeleteRepo={this.onDeleteRepo}
              toggle={this.toggleDeleteDialog}
            />
          </ModalPortal>
        }
        {isTransferDialogOpen &&
          <ModalPortal>
            <TransferDialog
              itemName={repo.name}
              submit={this.onTransferRepo}
              canTransferToDept={false}
              toggleDialog={this.toggleTransferDialog}
            />
          </ModalPortal>
        }
        {isHistorySettingDialogOpen &&
          <ModalPortal>
            <SysAdminLibHistorySettingDialog
              repoID={repo.id}
              itemName={repo.name}
              toggleDialog={this.toggleHistorySettingDialog}
            />
          </ModalPortal>
        }
      </Fragment>
    );
  }
}

export default Content;
