import React, { Component, Fragment } from 'react';
import Cookies from 'js-cookie';
import classnames from 'classnames';
import Repo from '../../models/repo';
import { seafileAPI } from '../../utils/seafile-api';
import { gettext } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import toaster from '../../components/toast';
import Loading from '../../components/loading';
import EmptyTip from '../../components/empty-tip';
import ModalPortal from '../../components/modal-portal';
import ViewModes from '../../components/view-modes';
import ReposSortMenu from '../../components/sort-menu';
import SingleDropdownToolbar from '../../components/toolbar/single-dropdown-toolbar';
import SortOptionsDialog from '../../components/dialog/sort-options';
import CreateRepoDialog from '../../components/dialog/create-repo-dialog';
import DeletedReposDialog from '../../components/dialog/my-deleted-repos-dialog';
import { LIST_MODE } from '../../components/dir-view-mode/constants';
import MylibRepoListView from './mylib-repo-list-view';

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
      currentViewMode: localStorage.getItem('sf_repo_list_view_mode') || LIST_MODE,
      sortBy: Cookies.get('seafile-repo-dir-sort-by') || 'name', // 'name' or 'time' or 'size'
      sortOrder: Cookies.get('seafile-repo-dir-sort-order') || 'asc', // 'asc' or 'desc'
    };

    this.emptyTip = (
      <EmptyTip
        title={gettext('No libraries')}
        text={gettext('You have not created any libraries yet. A library is a container to organize your files and folders. A library can also be shared with others and synced to your connected devices. You can create a library by clicking the "New Library" item in the dropdown menu.')}
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
    Cookies.set('seafile-repo-dir-sort-by', sortBy);
    Cookies.set('seafile-repo-dir-sort-order', sortOrder);
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

  switchViewMode = (newMode) => {
    this.setState({
      currentViewMode: newMode
    }, () => {
      localStorage.setItem('sf_repo_list_view_mode', newMode);
    });
  };

  onSelectSortOption = (sortOption) => {
    const [sortBy, sortOrder] = sortOption.value.split('-');
    this.setState({ sortBy, sortOrder }, () => {
      this.sortRepoList(sortBy, sortOrder);
    });
  };

  render() {
    const { isLoading, errorMsg, currentViewMode, sortBy, sortOrder, repoList } = this.state;
    const isDesktop = Utils.isDesktop();
    return (
      <Fragment>
        <div className="main-panel-center flex-row">
          <div className="cur-view-container">
            <div className="cur-view-path">
              <h3 className="sf-heading m-0 d-flex align-items-center">
                {gettext('My Libraries')}
                <SingleDropdownToolbar
                  withPlusIcon={true}
                  opList={[
                    { 'text': gettext('New Library'), 'onClick': this.toggleCreateRepoDialog },
                    { 'text': gettext('Deleted Libraries'), 'onClick': this.toggleDeletedReposDialog }
                  ]}
                />
              </h3>
              {isDesktop ? (
                <div className="d-flex align-items-center">
                  <ViewModes currentViewMode={currentViewMode} switchViewMode={this.switchViewMode} />
                  <ReposSortMenu className="ml-2" sortBy={sortBy} sortOrder={sortOrder} onSelectSortOption={this.onSelectSortOption} />
                </div>
              ) : (
                <>
                  {repoList.length > 0 &&
                    <span className="sf3-font sf3-font-sort action-icon" onClick={this.toggleSortOptionsDialog}></span>
                  }
                </>
              )}
            </div>
            <div className={classnames('cur-view-content', 'repos-container', { 'pt-3': currentViewMode != LIST_MODE })}>
              {isLoading
                ? <Loading />
                : errorMsg
                  ? <p className="error text-center mt-8">{errorMsg}</p>
                  : repoList.length == 0
                    ? this.emptyTip
                    : (
                      <MylibRepoListView
                        sortBy={sortBy}
                        sortOrder={sortOrder}
                        repoList={this.state.repoList}
                        onRenameRepo={this.onRenameRepo}
                        onDeleteRepo={this.onDeleteRepo}
                        onTransferRepo={this.onTransferRepo}
                        sortRepoList={this.sortRepoList}
                        currentViewMode={currentViewMode}
                      />
                    )
              }
            </div>
          </div>
          {this.state.isSortOptionsDialogOpen &&
            <SortOptionsDialog
              toggleDialog={this.toggleSortOptionsDialog}
              sortBy={sortBy}
              sortOrder={sortOrder}
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
