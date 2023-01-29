import React, { Component, Fragment } from 'react';
import { Button } from 'reactstrap';
import moment from 'moment';
import { Utils } from '../../../utils/utils';
import { seafileAPI } from '../../../utils/seafile-api';
import { gettext } from '../../../utils/constants';
import toaster from '../../../components/toast';
import EmptyTip from '../../../components/empty-tip';
import Loading from '../../../components/loading';
import Paginator from '../../../components/paginator';
import ModalPortal from '../../../components/modal-portal';
import OpMenu from '../../../components/dialog/op-menu';
import CommonOperationConfirmationDialog from '../../../components/dialog/common-operation-confirmation-dialog';
import MainPanelTopbar from '../main-panel-topbar';
import Search from '../search';
import UserLink from '../user-link';
import ReposNav from './repos-nav';

const { trashReposExpireDays } = window.sysadmin.pageOptions;

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
    const { loading, errorMsg, items, pageInfo, curPerPage } = this.props;
    if (loading) {
      return <Loading />;
    } else if (errorMsg) {
      return <p className="error text-center mt-4">{errorMsg}</p>;
    } else {
      const emptyTip = (
        <EmptyTip>
          <h2>{gettext('No deleted libraries')}</h2>
        </EmptyTip>
      );
      const table = (
        <Fragment>
          <p className="mt-4 small text-secondary">{gettext('Tip: libraries deleted {trashReposExpireDays} days ago will be cleaned automatically.').replace('{trashReposExpireDays}', trashReposExpireDays)}</p>
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
              {items.map((item, index) => {
                return (<Item
                  key={index}
                  repo={item}
                  isItemFreezed={this.state.isItemFreezed}
                  onFreezedItem={this.onFreezedItem}
                  onUnfreezedItem={this.onUnfreezedItem}
                  onDeleteRepo={this.props.onDeleteRepo}
                  onRestoreRepo={this.props.onRestoreRepo}
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

  onDeleteRepo = () => {
    const repo = this.props.repo;
    seafileAPI.sysAdminDeleteTrashRepo(repo.id).then((res) => {
      this.props.onDeleteRepo(repo);
      const msg = gettext('Successfully deleted {name}.').replace('{name}', repo.name);
      toaster.success(msg);
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  onRestoreRepo = () => {
    const repo = this.props.repo;
    seafileAPI.sysAdminRestoreTrashRepo(repo.id).then((res) => {
      this.props.onRestoreRepo(repo);
      let message = gettext('Successfully restored the library.');
      toaster.success(message);
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  toggleDeleteRepoDialog = (e) => {
    if (e) {
      e.preventDefault();
    }
    this.setState({isDeleteRepoDialogOpen: !this.state.isDeleteRepoDialogOpen});
  }

  toggleRestoreRepoDialog = (e) => {
    if (e) {
      e.preventDefault();
    }
    this.setState({isRestoreRepoDialogOpen: !this.state.isRestoreRepoDialogOpen});
  }

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
  }

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
  }

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
            {repo.owner.indexOf('@seafile_group') == -1 ?
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

class TrashRepos extends Component {

  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: '',
      repos: [],
      pageInfo: {},
      perPage: 25,
      isCleanTrashDialogOpen: false
    };
  }

  componentDidMount () {
    let urlParams = (new URL(window.location)).searchParams;
    const { currentPage = 1, perPage } = this.state;
    this.setState({
      perPage: parseInt(urlParams.get('per_page') || perPage),
      currentPage: parseInt(urlParams.get('page') || currentPage)
    }, () => {
      this.getReposByPage(this.state.currentPage);
    });
  }

  toggleCleanTrashDialog = () => {
    this.setState({isCleanTrashDialogOpen: !this.state.isCleanTrashDialogOpen});
  }

  getReposByPage = (page) => {
    let perPage = this.state.perPage;
    seafileAPI.sysAdminListTrashRepos(page, perPage).then((res) => {
      this.setState({
        repos: res.data.repos,
        pageInfo: res.data.page_info,
        loading: false
      });
    }).catch((error) => {
      this.setState({
        loading: false,
        errorMsg: Utils.getErrorMsg(error, true) // true: show login tip if 403
      });
    });
  }

  resetPerPage = (perPage) => {
    this.setState({
      perPage: perPage
    }, () => {
      this.getReposByPage(1);
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

  onRestoreRepo = (targetRepo) => {
    let repos = this.state.repos.filter(repo => {
      return repo.id != targetRepo.id;
    });
    this.setState({
      repos: repos
    });
  }

  cleanTrash = () => {
    seafileAPI.sysAdminCleanTrashRepos().then(res => {
      this.setState({repos: []});
      toaster.success(gettext('Successfully cleared trash.'));
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  getSearch = () => {
    return <Search
      placeholder={gettext('Search libraries by owner')}
      submit={this.searchRepos}
    />;
  }

  searchRepos = (owner) => {
    seafileAPI.sysAdminSearchTrashRepos(owner).then((res) => {
      this.setState({
        repos: res.data.repos,
        pageInfo: null,
        errorMsg: '', // necessary!
        loading: false
      });
    }).catch((error) => {
      this.setState({
        loading: false,
        errorMsg: Utils.getErrorMsg(error, true) // true: show login tip if 403
      });
    });
  }

  render() {
    const { isCleanTrashDialogOpen } = this.state;

    // enable 'search': <MainPanelTopbar search={this.getSearch()}>
    return (
      <Fragment>
        {this.state.repos.length ? (
          <MainPanelTopbar {...this.props}>
            <Button className="operation-item" onClick={this.toggleCleanTrashDialog}>{gettext('Clean')}</Button>
          </MainPanelTopbar>
        ) : <MainPanelTopbar {...this.props} />
        }
        <div className="main-panel-center flex-row">
          <div className="cur-view-container">
            <ReposNav currentItem="trash" />
            <div className="cur-view-content">
              <Content
                loading={this.state.loading}
                errorMsg={this.state.errorMsg}
                items={this.state.repos}
                pageInfo={this.state.pageInfo}
                onDeleteRepo={this.onDeleteRepo}
                onRestoreRepo={this.onRestoreRepo}
                getListByPage={this.getReposByPage}
                resetPerPage={this.resetPerPage}
                curPerPage={this.state.perPage}
              />
            </div>
          </div>
        </div>
        {isCleanTrashDialogOpen &&
          <CommonOperationConfirmationDialog
            title={gettext('Clear Trash')}
            message={gettext('Are you sure you want to clear trash?')}
            executeOperation={this.cleanTrash}
            confirmBtnText={gettext('Clear')}
            toggleDialog={this.toggleCleanTrashDialog}
          />
        }
      </Fragment>
    );
  }
}

export default TrashRepos;
