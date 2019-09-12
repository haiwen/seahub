import React, { Component, Fragment } from 'react';
import { Button } from 'reactstrap';
import { seafileAPI } from '../../../utils/seafile-api';
import { gettext ,siteRoot } from '../../../utils/constants';
import toaster from '../../../components/toast';
import { Utils } from '../../../utils/utils';
import EmptyTip from '../../../components/empty-tip';
import moment from 'moment';
import Loading from '../../../components/loading';
import Paginator from '../../../components/paginator';
import ModalPortal from '../../../components/modal-portal';
import CommonOperationDialog from '../../../components/dialog/common-operation-dialog';
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
          <h2>{gettext('No Trash')}</h2>
        </EmptyTip>
      );
      const table = (
        <Fragment>
          <span className="text-muted">{gettext('Tip: libraries deleted 30 days ago will be cleaned automatically.')}</span>
          <table className="table-hover">
            <thead>
              <tr>
                <th width="5%">{/*icon*/}</th>
                <th width="25%">{gettext('Name')}</th>
                <th width="30%">{gettext('Owner')}</th>
                <th width="30%">{gettext('Deleted Time')}</th>
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
                  onDeleteRepoTrash={this.props.onDeleteRepoTrash}
                  onRestoreRepoTrash={this.props.onRestoreRepoTrash}
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
      isDeleteRepoTrashDialogOpen: false,
      isRestoreRepoTrashDialogOpen: false
    };
  }

  onDeleteRepo = () => {
    let { repo } = this.props;
    seafileAPI.sysAdminDeleteTrashRepo(repo.id).then((res) => {
      this.props.onDeleteRepoTrash(repo);
      let name = repo.name;
      var msg = gettext('Successfully deleted {name} compeletly.').replace('{name}', name);
      toaster.success(msg);
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      if (errMessage === gettext('Error')) {
        let name = repo.name;
        errMessage = gettext('Failed to delete {name}.').replace('{name}', name);
      }
      toaster.danger(errMessage);
    });
    this.toggleDeleteRepoTrashDialog();
  }

  onRestoreRepo = () => {
    seafileAPI.sysAdminRestoreTrashRepo(this.props.repo.id).then((res) => {
      this.props.onRestoreRepoTrash(this.props.repo);
      let message = gettext('Successfully restored the library.');
      toaster.success(message);
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
    this.toggleRestoreRepoTrashDialog();
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
      case 'Delete':
        this.toggleDeleteRepoTrashDialog();
        break;
      case 'Transfer':
        this.toggleRestoreRepoTrashDialog();
        break;
      default:
        break;
    }
  }

  toggleDeleteRepoTrashDialog = (e) => {
    if (e) e.preventDefault();
    this.setState({isDeleteRepoTrashDialogOpen: !this.state.isDeleteRepoTrashDialogOpen});
  }

  toggleRestoreRepoTrashDialog = (e) => {
    if (e) e.preventDefault();
    this.setState({isRestoreRepoTrashDialogOpen: !this.state.isRestoreRepoTrashDialogOpen});
  }

  renderPCUI = () => {
    let repo = this.props.repo;
    let { isOpIconShown } = this.state;
    let iconUrl = Utils.getLibIconUrl(repo);
    let iconTitle = Utils.getLibIconTitle(repo);

    return (
      <tr className={this.state.highlight ? 'tr-highlight' : ''} onMouseEnter={this.handleMouseOver} onMouseLeave={this.handleMouseOut} onClick={this.onRepoClick}>
        <td><img src={iconUrl} title={iconTitle} alt={iconTitle} width="24" /></td>
        <td>{repo.name}</td>
        <td><a href={siteRoot + 'useradmin/info/' + encodeURIComponent(repo.owner) + '/'}>{repo.owner_name}</a></td>
        <td>{moment(repo.delete_time).fromNow()}</td>
        <td>
          {(repo.name && isOpIconShown) &&
            <div>
              <a href="#" className="op-icon sf2-icon-reply" title={gettext('Restore')} onClick={this.toggleRestoreRepoTrashDialog}></a>
              <a href="#" className="op-icon sf2-icon-delete" title={gettext('Delete')} onClick={this.toggleDeleteRepoTrashDialog}></a>
            </div>
          }
        </td>
      </tr>
    );
  }

  render () {
    let { repo } = this.props;
    let { isDeleteRepoTrashDialogOpen, isRestoreRepoTrashDialogOpen } = this.state;

    const repoName = '<span class="op-target">' + Utils.HTMLescape(repo.name) + '</span>';
    let messageDeleteTrash = gettext('Are you sure you want to delete %s completely?').replace('%s', repoName);
    let messageRestoreTrash = gettext('Are you sure you want to restore %s ?').replace('%s', repoName);

    return (
      <Fragment>
        {this.renderPCUI()}
        {isDeleteRepoTrashDialogOpen &&
          <ModalPortal>
            <CommonOperationDialog
              title={gettext('Delete Library')}
              message={messageDeleteTrash}
              executeOperation={this.onDeleteRepo}
              toggle={this.toggleDeleteRepoTrashDialog}
              confirmBtnText={gettext('Delete')}
            />
          </ModalPortal>
        }
        {isRestoreRepoTrashDialogOpen &&
          <ModalPortal>
            <CommonOperationDialog
              title={gettext('Restore Library')}
              message={messageRestoreTrash}
              executeOperation={this.onRestoreRepo}
              toggle={this.toggleRestoreRepoTrashDialog}
              confirmBtnText={gettext('Restore')}
            />
          </ModalPortal>
        }
      </Fragment>
    );
  }
}

class ReposTrash extends Component {

  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: '',
      repos: {},
      pageInfo: {},
      perPage: 50,
      isCleanRepoTrashDialogOpen: false
    };
  }

  componentDidMount () {
    this.getReposByPage(1);
  }

  toggleCleanRepoTrashDialog = () => {
    this.setState({isCleanRepoTrashDialogOpen: !this.state.isCleanRepoTrashDialogOpen});
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

  onDeleteRepoTrash = (repo) => {
    let new_repos = this.state.repos.filter(eachRepo => {
      return eachRepo.id != repo.id;
    });
    this.setState({
      repos: new_repos
    });
  }

  onRestoreRepoTrash = (repo) => {
    let new_repos = this.state.repos.filter(eachRepo => {
      return eachRepo.id != repo.id;
    });
    this.setState({
      repos: new_repos
    }); 
  }

  cleanRepoTrash = () => {
    seafileAPI.sysAdminCleanTrashRepos().then(res => {
      this.setState({repos: {}});
      this.toggleCleanRepoTrashDialog();
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  render() {
    let { isCleanRepoTrashDialogOpen } = this.state;
    return (
      <Fragment>
        <MainPanelTopbar>
          {this.state.repos.length &&
            <Button className={'btn btn-secondary operation-item'} onClick={this.toggleCleanRepoTrashDialog}>{gettext('Clean')}</Button>
          }
        </MainPanelTopbar>
        <div className="main-panel-center flex-row">
          <div className="cur-view-container">
            <ReposNav currentItem="trash" />
            <div className="cur-view-content">
              <Content
                getListByPage={this.getReposByPage}
                toggleModal={this.toggleModal}
                loading={this.state.loading}
                errorMsg={this.state.errorMsg}
                items={this.state.repos}
                pageInfo={this.state.pageInfo}
                onDeleteRepoTrash={this.onDeleteRepoTrash}
                onRestoreRepoTrash={this.onRestoreRepoTrash}
              />
            </div>
          </div>
        </div>
        {isCleanRepoTrashDialogOpen &&
          <CommonOperationDialog
            title={gettext('Clear Trash')}
            message={gettext('Are you sure you want to clear trash?')}
            executeOperation={this.cleanRepoTrash}
            toggle={this.toggleCleanRepoTrashDialog} 
          />
        }

      </Fragment>
    );
  }
}

export default ReposTrash;
