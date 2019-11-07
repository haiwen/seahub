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
import CommonOperationConfirmationDialog from '../../../components/dialog/common-operation-confirmation-dialog';
import UserLink from '../user-link';
import ReposNav from './repos-nav';
import MainPanelTopbar from '../main-panel-topbar';

const { trashReposExpireDays } = window.sysadmin.pageOptions;

class Content extends Component {

  constructor(props) {
    super(props);
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
      return <p className="error text-center mt-4">{errorMsg}</p>;
    } else {
      const emptyTip = (
        <EmptyTip>
          <h2>{gettext('No deleted libraries.')}</h2>
        </EmptyTip>
      );
      const table = (
        <Fragment>
          <p className="mt-4 small text-secondary">{gettext('Tip: libraries deleted {trashReposExpireDays} days ago will be cleaned automatically.').replace('{trashReposExpireDays}', trashReposExpireDays)}</p>
          <table className="table-hover">
            <thead>
              <tr>
                <th width="5%">{/*icon*/}</th>
                <th width="40%">{gettext('Name')}</th>
                <th width="25%">{gettext('Owner')}</th>
                <th width="20%">{gettext('Deleted Time')}</th>
                <th width="10%">{/*Operations*/}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                return (<Item
                  key={index}
                  repo={item}
                  onDeleteRepo={this.props.onDeleteRepo}
                  onRestoreRepo={this.props.onRestoreRepo}
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
      isDeleteRepoDialogOpen: false,
      isRestoreRepoDialogOpen: false
    };
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

  handleMouseOver = () => {
    this.setState({
      isOpIconShown: true
    });
  }

  handleMouseOut = () => {
    this.setState({
      isOpIconShown: false
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
              <Fragment>
                <a href="#" className="op-icon sf2-icon-reply" title={gettext('Restore')} onClick={this.toggleRestoreRepoDialog}></a>
                <a href="#" className="op-icon sf2-icon-delete" title={gettext('Delete')} onClick={this.toggleDeleteRepoDialog}></a>
              </Fragment>
            )}
          </td>
        </tr>
        {isDeleteRepoDialogOpen &&
          <ModalPortal>
            <CommonOperationConfirmationDialog
              title={gettext('Delete Library')}
              message={gettext('Are you sure you want to delete {repo_name} completely?').replace('{repo_name}', repoName)}
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
              message={gettext('Are you sure you want to restore %s ?').replace('%s', repoName)}
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
      perPage: 100,
      isCleanTrashDialogOpen: false
    };
  }

  componentDidMount () {
    this.getReposByPage(1);
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

  render() {
    const { isCleanTrashDialogOpen } = this.state;
    return (
      <Fragment>
        {this.state.repos.length ? (
          <MainPanelTopbar>
            <Button className="operation-item" onClick={this.toggleCleanTrashDialog}>{gettext('Clean')}</Button>
          </MainPanelTopbar>
        ) : <MainPanelTopbar />
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
