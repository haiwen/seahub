import React, { Component, Fragment } from 'react';
import cookie from 'react-cookies';
import { seafileAPI } from '../../utils/seafile-api';
import { gettext } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import toaster from '../../components/toast';
import Repo from '../../models/repo';
import Loading from '../../components/loading';
import EmptyTip from '../../components/empty-tip';
import MylibRepoListView from './mylib-repo-list-view';
import SortOptionsDialog from '../../components/dialog/sort-options';
import SingleDropdownToolbar from '../../components/toolbar/single-dropdown-toolbar';
import ModalPortal from '../../components/modal-portal';
import CreateRepoDialog from '../../components/dialog/create-repo-dialog';
import DeletedReposDialog from '../../components/dialog/my-deleted-repos';

class MyLibraries extends Component {
  constructor(props) {
    super(props);
    this.state = {
      errorMsg: '',
      isLoading: true,
      repoList: [],
      isDeletedReposDialogOpen: false,
      isCreateRepoDialogOpen: false,
      isSortOptionsDialogOpen: false,
      sortBy: cookie.load('seafile-repo-dir-sort-by') || 'name', // 'name' or 'time' or 'size'
      sortOrder: cookie.load('seafile-repo-dir-sort-order') || 'asc', // 'asc' or 'desc'
    };

    this.emptyTip = (
      <EmptyTip
        title={gettext('No libraries')}
        text={gettext('You have not created any libraries yet. A library is a container to organize your files and folders. A library can also be shared with others and synced to your connected devices. You can create a library by clicking the "New Library" button in the menu bar.')}
      >
      </EmptyTip>
    );
  }

  componentDidMount() {
    seafileAPI.listRepos({ type: 'mine' }).then((res) => {
      let repoList = res.data.repos.map((item) => {
        return new Repo(item);
      });
      this.setState({
        isLoading: false,
        repoList: Utils.sortRepos(repoList, this.state.sortBy, this.state.sortOrder)
      });
    }).catch((error) => {
      this.setState({
        isLoading: false,
        errorMsg: Utils.getErrorMsg(error, true) // true: show login tip if 403
      });
    });
  }

  toggleSortOptionsDialog = () => {
    this.setState({
      isSortOptionsDialogOpen: !this.state.isSortOptionsDialogOpen
    });
  };

  onCreateRepo = (repo) => {
    this.toggleCreateRepoDialog();
    seafileAPI.createMineRepo(repo).then((res) => {
      const newRepo = new Repo({
        repo_id: res.data.repo_id,
        repo_name: res.data.repo_name,
        size: res.data.repo_size,
        mtime: res.data.mtime,
        owner_email: res.data.email,
        encrypted: res.data.encrypted,
        permission: res.data.permission,
        storage_name: res.data.storage_name
      });
      this.state.repoList.unshift(newRepo);
      this.setState({ repoList: this.state.repoList });
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  sortRepoList = (sortBy, sortOrder) => {
    cookie.save('seafile-repo-dir-sort-by', sortBy);
    cookie.save('seafile-repo-dir-sort-order', sortOrder);
    this.setState({
      sortBy: sortBy,
      sortOrder: sortOrder,
      repoList: Utils.sortRepos(this.state.repoList, sortBy, sortOrder)
    });
  };

  onTransferRepo = (repoID) => {
    let repoList = this.state.repoList.filter(item => {
      return item.repo_id !== repoID;
    });
    this.setState({ repoList: repoList });
  };

  onRenameRepo = (repo, newName) => {
    let repoList = this.state.repoList.map(item => {
      if (item.repo_id === repo.repo_id) {
        item.repo_name = newName;
      }
      return item;
    });
    this.setState({ repoList: repoList });
  };

  onMonitorRepo = (repo, monitored) => {
    let repoList = this.state.repoList.map(item => {
      if (item.repo_id === repo.repo_id) {
        item.monitored = monitored;
      }
      return item;
    });
    this.setState({ repoList: repoList });
  };

  onDeleteRepo = (repo) => {
    let repoList = this.state.repoList.filter(item => {
      return item.repo_id !== repo.repo_id;
    });
    this.setState({ repoList: repoList });
  };

  toggleCreateRepoDialog = () => {
    this.setState({ isCreateRepoDialogOpen: !this.state.isCreateRepoDialogOpen });
  };

  toggleDeletedReposDialog = () => {
    this.setState({
      isDeletedReposDialogOpen: !this.state.isDeletedReposDialogOpen
    });
  };

  render() {
    return (
      <Fragment>
        <div className="main-panel-center flex-row">
          <div className="cur-view-container">
            <div className="cur-view-path">
              <h3 className="sf-heading m-0">
                {gettext('My Libraries')}
                <SingleDropdownToolbar
                  opList={[
                    { 'text': gettext('New Library'), 'onClick': this.toggleCreateRepoDialog },
                    { 'text': gettext('Deleted Libraries'), 'onClick': this.toggleDeletedReposDialog }
                  ]}
                />
              </h3>
              <div>
                {(!Utils.isDesktop() && this.state.repoList.length > 0) && <span className="sf3-font sf3-font-sort action-icon" onClick={this.toggleSortOptionsDialog}></span>}
              </div>
            </div>
            <div className="cur-view-content">
              {this.state.isLoading && <Loading />}
              {!this.state.isLoading && this.state.errorMsg && <p className="error text-center mt-8">{this.state.errorMsg}</p>}
              {!this.state.isLoading && !this.state.errorMsg && this.state.repoList.length === 0 && this.emptyTip}
              {!this.state.isLoading && !this.state.errorMsg && this.state.repoList.length > 0 &&
                <MylibRepoListView
                  sortBy={this.state.sortBy}
                  sortOrder={this.state.sortOrder}
                  repoList={this.state.repoList}
                  onRenameRepo={this.onRenameRepo}
                  onDeleteRepo={this.onDeleteRepo}
                  onTransferRepo={this.onTransferRepo}
                  onMonitorRepo={this.onMonitorRepo}
                  sortRepoList={this.sortRepoList}
                  toggleCreateRepoDialog={this.toggleCreateRepoDialog}
                />
              }
            </div>
          </div>
          {this.state.isSortOptionsDialogOpen &&
            <SortOptionsDialog
              toggleDialog={this.toggleSortOptionsDialog}
              sortBy={this.state.sortBy}
              sortOrder={this.state.sortOrder}
              sortItems={this.sortRepoList}
            />
          }
          {this.state.isCreateRepoDialogOpen && (
            <ModalPortal>
              <CreateRepoDialog
                libraryType='mine'
                onCreateRepo={this.onCreateRepo}
                onCreateToggle={this.toggleCreateRepoDialog}
              />
            </ModalPortal>
          )}
          {this.state.isDeletedReposDialogOpen && (
            <ModalPortal>
              <DeletedReposDialog
                toggleDialog={this.toggleDeletedReposDialog}
              />
            </ModalPortal>
          )}
        </div>
      </Fragment>
    );
  }
}

export default MyLibraries;
