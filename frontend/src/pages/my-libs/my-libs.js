import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import cookie from 'react-cookies';
import { navigate } from '@gatsbyjs/reach-router';
import { DropdownToggle, Dropdown, DropdownMenu, DropdownItem } from 'reactstrap';
import { seafileAPI } from '../../utils/seafile-api';
import { gettext, siteRoot } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import toaster from '../../components/toast';
import Repo from '../../models/repo';
import Loading from '../../components/loading';
import EmptyTip from '../../components/empty-tip';
import TopToolbar from '../../components/toolbar/top-toolbar';
import MylibRepoListView from './mylib-repo-list-view';
import SortOptionsDialog from '../../components/dialog/sort-options';
import SingleDropdownToolbar from '../../components/toolbar/single-dropdown-toolbar';
import ModalPortal from '../../components/modal-portal';
import CreateRepoDialog from '../../components/dialog/create-repo-dialog';

const propTypes = {
  onShowSidePanel: PropTypes.func.isRequired,
  onSearchedClick: PropTypes.func.isRequired,
};

class MyLibraries extends Component {
  constructor(props) {
    super(props);
    this.state = {
      errorMsg: '',
      isLoading: true,
      repoList: [],
      isCreateRepoDialogOpen: false,
      isDropdownMenuOpen: false,
      isSortOptionsDialogOpen: false,
      sortBy: cookie.load('seafile-repo-dir-sort-by') || 'name', // 'name' or 'time' or 'size'
      sortOrder: cookie.load('seafile-repo-dir-sort-order') || 'asc', // 'asc' or 'desc'
    };

    this.emptyTip = (
      <EmptyTip>
        <h2>{gettext('No libraries')}</h2>
        <p>{gettext('You have not created any libraries yet. A library is a container to organize your files and folders. A library can also be shared with others and synced to your connected devices. You can create a library by clicking the "New Library" button in the menu bar.')}</p>
      </EmptyTip>
    );
  }

  componentDidMount() {
    seafileAPI.listRepos({type: 'mine'}).then((res) => {
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
      this.setState({repoList: this.state.repoList});
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
    this.setState({repoList: repoList});
  };

  onRenameRepo = (repo, newName) => {
    let repoList = this.state.repoList.map(item => {
      if (item.repo_id === repo.repo_id) {
        item.repo_name = newName;
      }
      return item;
    });
    this.setState({repoList: repoList});
  };

  onMonitorRepo = (repo, monitored) => {
    let repoList = this.state.repoList.map(item => {
      if (item.repo_id === repo.repo_id) {
        item.monitored = monitored;
      }
      return item;
    });
    this.setState({repoList: repoList});
  };

  onDeleteRepo = (repo) => {
    let repoList = this.state.repoList.filter(item => {
      return item.repo_id !== repo.repo_id;
    });
    this.setState({repoList: repoList});
  };

  toggleCreateRepoDialog = () => {
    this.setState({isCreateRepoDialogOpen: !this.state.isCreateRepoDialogOpen});
  };

  toggleDropdownMenu = () => {
    this.setState({
      isDropdownMenuOpen: !this.state.isDropdownMenuOpen
    });
  };

  visitDeleted = () => {
    navigate(`${siteRoot}my-libs/deleted/`);
  };

  visitDeletedviaKey = (e) => {
    if (e.key == 'Enter' || e.key == 'Space') {
      this.visiteDeleted();
    }
  };

  render() {
    const { isDropdownMenuOpen } = this.state;
    return (
      <Fragment>
        <TopToolbar
          onShowSidePanel={this.props.onShowSidePanel}
          onSearchedClick={this.props.onSearchedClick}
        >
        </TopToolbar>
        <div className="main-panel-center flex-row">
          <div className="cur-view-container">
            <div className="cur-view-path">
              <h3 className="sf-heading m-0">
                {gettext('My Libraries')}
                <SingleDropdownToolbar
                  opList={[{'text': gettext('New Library'), 'onClick': this.toggleCreateRepoDialog}]}
                />
              </h3>
              <div>
                {(!Utils.isDesktop() && this.state.repoList.length > 0) && <span className="sf3-font sf3-font-sort action-icon" onClick={this.toggleSortOptionsDialog}></span>}
                <Dropdown isOpen={isDropdownMenuOpen} toggle={this.toggleDropdownMenu}>
                  <DropdownToggle
                    tag="i"
                    className={'cur-view-path-btn sf3-font-more sf3-font ml-2'}
                    data-toggle="dropdown"
                    title={gettext('More operations')}
                    aria-label={gettext('More operations')}
                    aria-expanded={isDropdownMenuOpen}
                  >
                  </DropdownToggle>
                  <DropdownMenu right={true}>
                    <DropdownItem onClick={this.visitDeleted} onKeyDown={this.visitDeletedviaKey}>{gettext('Deleted Libraries')}</DropdownItem>
                  </DropdownMenu>
                </Dropdown>
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
        </div>
      </Fragment>
    );
  }
}

MyLibraries.propTypes = propTypes;

export default MyLibraries;
