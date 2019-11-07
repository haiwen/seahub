import React, { Component, Fragment } from 'react';
import { Link } from '@reach/router';
import { Button } from 'reactstrap';
import { Utils } from '../../../utils/utils';
import { seafileAPI } from '../../../utils/seafile-api';
import { loginUrl, gettext, siteRoot, isPro } from '../../../utils/constants';
import toaster from '../../../components/toast';
import EmptyTip from '../../../components/empty-tip';
import Loading from '../../../components/loading';
import Paginator from '../../../components/paginator';
import ModalPortal from '../../../components/modal-portal';
import TransferDialog from '../../../components/dialog/transfer-dialog';
import DeleteRepoDialog from '../../../components/dialog/delete-repo-dialog';
import SysAdminShareDialog from '../../../components/dialog/sysadmin-dialog/sysadmin-share-dialog';
import SysAdminLibHistorySettingDialog from '../../../components/dialog/sysadmin-dialog/sysadmin-lib-history-setting-dialog';
import SysAdminCreateRepoDialog from '../../../components/dialog/sysadmin-dialog/sysadmin-create-repo-dialog';
import MainPanelTopbar from '../main-panel-topbar';
import UserLink from '../user-link';
import ReposNav from './repos-nav';
import RepoOpMenu from './repo-op-menu';

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

  render() {
    const { loading, errorMsg, items, pageInfo } = this.props;
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
      const table = (
        <Fragment>
          <table>
            <thead>
              <tr>
                <th width="5%">{/*icon*/}</th>
                <th width="25%">{gettext('Name')}</th>
                <th width="15%">{gettext('Files')}{' / '}{gettext('Size')}</th>
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
          <Paginator
            gotoPreviousPage={this.getPreviousPageList}
            gotoNextPage={this.getNextPageList}
            currentPage={pageInfo.current_page}
            hasNextPage={pageInfo.has_next_page}
            canResetPerPage={false}
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
      highlight: false,
      isShareDialogOpen: false,
      isDeleteDialogOpen: false,
      isTransferDialogOpen: false,
      isHistorySettingDialogOpen: false
    };
  }

  onDeleteRepo = (repo) => {
    seafileAPI.sysAdminDeleteRepo(repo.id).then((res) => {
      this.props.onDeleteRepo(repo);
      const msg = gettext('Successfully deleted {name}.').replace('{name}', repo.name);
      toaster.success(msg);
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
    this.toggleDeleteDialog();
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

  render () {
    let { repo } = this.props;
    let { isOpIconShown,
      isShareDialogOpen, isDeleteDialogOpen, 
      isTransferDialogOpen, isHistorySettingDialogOpen
    } = this.state;
    let iconUrl = Utils.getLibIconUrl(repo);
    let iconTitle = Utils.getLibIconTitle(repo);
    let isGroupOwnedRepo = repo.owner.indexOf('@seafile_group') != -1;

    return (
      <Fragment>
        <tr className={this.state.highlight ? 'tr-highlight' : ''} onMouseEnter={this.handleMouseOver} onMouseLeave={this.handleMouseOut}>
          <td><img src={iconUrl} title={iconTitle} alt={iconTitle} width="24" /></td>
          <td>{this.renderRepoName()}</td>
          <td>{`${repo.file_count} / ${Utils.bytesToSize(repo.size)}`}</td>
          <td>{repo.id}</td>
          <td>
            {isGroupOwnedRepo ?
              <Link to={`${siteRoot}sys/departments/${repo.owner_name}/`}>{repo.group_name}</Link> :
              <UserLink email={repo.owner_email} name={repo.owner_name} />
            }
          </td>
          <td>
            {(!isGroupOwnedRepo && isOpIconShown) &&
            <RepoOpMenu
              repo={repo}
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

class AllRepos extends Component {

  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: '',
      repos: [],
      pageInfo: {},
      perPage: 100,
      isCreateRepoDialogOpen: false
    };
  }

  componentDidMount () {
    this.getReposByPage(1);
  }

  toggleCreateRepoDialog = () => {
    this.setState({isCreateRepoDialogOpen: !this.state.isCreateRepoDialogOpen});
  }

  getReposByPage = (page) => {
    seafileAPI.sysAdminListAllRepos(page, this.state.perPage).then((res) => {
      this.setState({
        loading: false,
        repos: res.data.repos,
        pageInfo: res.data.page_info
      });
    }).catch((error) => {
      if (error.response) {
        if (error.response.status == 403) {
          this.setState({
            loading: false,
            errorMsg: gettext('Permission denied')
          }); 
          location.href = `${loginUrl}?next=${encodeURIComponent(location.href)}`;
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

  createRepo = (repoName, Owner) => {
    seafileAPI.sysAdminCreateRepo(repoName, Owner).then(res => {
      this.state.repos.unshift(res.data);
      this.setState({
        repos: this.state.repos
      });
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  onDeleteRepo = (targetRepo) => {
    let repos = this.state.repos.filter(repo => {
      return repo.id != targetRepo.id;
    });
    this.setState({
      repos: repos
    });
  }

  onTransferRepo = (targetRepo) => {
    let repos = this.state.repos.map((item) => {
      return item.id == targetRepo.id ? targetRepo : item;
    });
    this.setState({
      repos: repos
    });
  }

  render() {
    let { isCreateRepoDialogOpen } = this.state;
    return (
      <Fragment>
        <MainPanelTopbar>
          <Button className="btn btn-secondary operation-item" onClick={this.toggleCreateRepoDialog}>
            <i className="fas fa-plus-square text-secondary mr-1"></i>{gettext('New Library')}
          </Button>          
        </MainPanelTopbar>
        <div className="main-panel-center flex-row">
          <div className="cur-view-container">
            <ReposNav currentItem="all" />
            <div className="cur-view-content">
              <Content
                loading={this.state.loading}
                errorMsg={this.state.errorMsg}
                items={this.state.repos}
                pageInfo={this.state.pageInfo}
                getListByPage={this.getReposByPage}
                onDeleteRepo={this.onDeleteRepo}
                onTransferRepo={this.onTransferRepo}
              />
            </div>
          </div>
        </div>
        {isCreateRepoDialogOpen &&
        <SysAdminCreateRepoDialog
          createRepo={this.createRepo}
          toggleDialog={this.toggleCreateRepoDialog}
        />
        }
      </Fragment>
    );
  }
}

export default AllRepos;
