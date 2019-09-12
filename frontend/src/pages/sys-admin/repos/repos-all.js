import React, { Component, Fragment } from 'react';
import { Button } from 'reactstrap';
import { seafileAPI } from '../../../utils/seafile-api';
import { gettext, siteRoot } from '../../../utils/constants';
import toaster from '../../../components/toast';
import { Utils } from '../../../utils/utils';
import EmptyTip from '../../../components/empty-tip';
import Loading from '../../../components/loading';
import Paginator from '../../../components/paginator';
import AdminRepoManul from './admin-repo-manul';
import ModalPortal from '../../../components/modal-portal';
import SysAdminShareDialog from '../../../components/dialog/sysadmin-dialog/sysadmin-share-dialog';
import DeleteRepoDialog from '../../../components/dialog/delete-repo-dialog';
import TransferDialog from '../../../components/dialog/transfer-dialog';
import SysAdminLibHistorySettingDialog from '../../../components/dialog/sysadmin-dialog/sysadmin-lib-history-setting-dialog';
import SysAdminCreateRepoDialog from '../../../components/dialog/sysadmin-dialog/sysadmin-create-repo-dialog';
import ReposNav from './repos-nav';
import MainPanelTopbar from '../main-panel-topbar';


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
          <h2>{gettext('No connected devices')}</h2>
        </EmptyTip>
      );
      const table = (
        <Fragment>
          <table className="table-hover">
            <thead>
              <tr>
                <th width="5%">{/*icon*/}</th>
                <th width="25%">{gettext('Name')}</th>
                <th width="15%">{gettext('Files')}{' / '}{gettext('Size')}</th>
                <th width="30%">{gettext('ID')}</th>
                <th width="15%">{gettext('Owner')}</th>
                <th width="10%">{/*Operations*/}</th>
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
      isHistorySettingDialogOpen: false,
    };
  }

  onDeleteRepo = (repo) => {
    seafileAPI.sysAdminDeleteRepo(repo.id).then((res) => {
      this.props.onDeleteRepo(repo);
      let name = repo.name;
      var msg = gettext('Successfully deleted {name}.').replace('{name}', name);
      toaster.success(msg);
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      if (errMessage === gettext('Error')) {
        let name = repo.name;
        errMessage = gettext('Failed to delete {name}.').replace('{name}', name);
      }
      toaster.danger(errMessage);
    });
    this.toggleDeleteDialog();
  }

  onTransferRepo = (owner) => {
    seafileAPI.sysAdminTransferRepo(this.props.repo.id, owner.email).then((res) => {
      this.props.onTransferRepo(res.data, this.props.repo.id);
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
        highlight: true,
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
      isOpIconShow: false,
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

  render () {
    let { repo } = this.props;
    let { isShareDialogOpen, isDeleteDialogOpen, isTransferDialogOpen } = this.state;
    let { isOpIconShown } = this.state;
    let iconUrl = Utils.getLibIconUrl(repo);
    let iconTitle = Utils.getLibIconTitle(repo);
    let isGroupOwnedRepo = repo.owner_email.indexOf('@seafile_group') > -1;
    return (
      <Fragment>
        <tr className={this.state.highlight ? 'tr-highlight' : ''} onMouseEnter={this.handleMouseOver} onMouseLeave={this.handleMouseOut} onClick={this.onRepoClick}>
          <td><img src={iconUrl} title={iconTitle} alt={iconTitle} width="24" /></td>
          <td>{repo.name}</td>
          <td>{repo.file_count}{' / '}{Utils.bytesToSize(repo.size)}</td>
          <td>{repo.id}</td>
          {repo.group_name ?
            <td><a href={siteRoot + 'sysadmin/#address-book/groups/' + repo.owner_name + '/'}>{repo.group_name}</a></td> :
            <td><a href={siteRoot + 'useradmin/info/' + repo.owner_email + '/'}>{repo.owner_name}</a></td>
          }
          <td>
            {(!isGroupOwnedRepo && repo.name && isOpIconShown) &&
              <div>
                {/* <a href="#" className="op-icon sf2-icon-share" title={gettext('Share')} onClick={this.toggleShareDialog}></a> */}
                <a href="#" className="op-icon sf2-icon-delete" title={gettext('Delete')} onClick={this.toggleDeleteDialog}></a>
                <a href="#" className="op-icon sf2-icon-library" title={gettext('Trasfer')} onClick={this.toggleTransferDialog}></a>
                <AdminRepoManul
                  isPC={true}
                  repo={repo}
                  onMenuItemClick={this.onMenuItemClick}
                  onFreezedItem={this.props.onFreezedItem}
                  onUnfreezedItem={this.onUnfreezedItem}
                />
              </div>
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
              toggleDialog={this.toggleTransferDialog}
            />
          </ModalPortal>
        }
        {this.state.isHistorySettingDialogOpen &&
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
      repos: {},
      pageInfo: {},
      perPage: 50,
      isCreateRepoDialogOpen: false,
    };
  }

  componentDidMount () {
    this.getReposByPage(1);
  }

  componentWillUnmount() {
    this.setState = (state, callback) => {
      return;
    };
  }

  toggleCreateRepoDialog = () => {
    this.setState({isCreateRepoDialogOpen: !this.state.isCreateRepoDialogOpen});
  }

  getReposByPage = (page) => {
    let per_page = this.state.perPage;
    seafileAPI.sysAdminListAllRepos(page, per_page).then((res) => {
      this.setState({
        repos: res.data.repos,
        pageInfo: res.data.page_info,
        loading: false
      });
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  createRepo = (repoName, Owner) => {
    seafileAPI.sysAdminCreateRepo(repoName, Owner).then(res => {
      this.toggleCreateRepoDialog();
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  onDeleteRepo = (repo) => {
    let new_repos = this.state.repos.filter(eachRepo => {
      return eachRepo.id != repo.id;
    });
    this.setState({
      repos: new_repos
    });
  }

  onTransferRepo = (repoInfo, repoID) => {
    let new_repos = this.state.repos.map(eachRepo => {
      if (eachRepo.id == repoID) {
        if (repoInfo.group_name) {
          eachRepo.group_name = repoInfo.group_name;
          eachRepo.owner_name = repoInfo.owner_name;
        } else {
          eachRepo.owner_name = repoInfo.owner_name;
          eachRepo.owner_email = repoInfo.owner_email;
          eachRepo.group_name = null;
        }
      }
      return eachRepo;
    });
    this.setState({
      repos: new_repos
    });
  }

  render() {
    let { isCreateRepoDialogOpen } = this.state;
    return (
      <Fragment>
        <MainPanelTopbar>
          <Button className={'btn btn-secondary operation-item'} onClick={this.toggleCreateRepoDialog}>{gettext('New Library')}</Button>          
        </MainPanelTopbar>
        <div className="main-panel-center flex-row">
          <div className="cur-view-container">
            <ReposNav currentItem="all" />
            <div className="cur-view-content">
              <Content
                getListByPage={this.getReposByPage}
                loading={this.state.loading}
                errorMsg={this.state.errorMsg}
                items={this.state.repos}
                pageInfo={this.state.pageInfo}
                onDeleteRepo={this.onDeleteRepo}
                onTransferRepo={this.onTransferRepo}
              />
            </div>
          </div>
        </div>
        {isCreateRepoDialogOpen &&
        <SysAdminCreateRepoDialog
          createRepo={this.createRepo}
          createRepoDialogToggle={this.toggleCreateRepoDialog}
        />
        }
      </Fragment>
    );
  }


}

export default AllRepos;
