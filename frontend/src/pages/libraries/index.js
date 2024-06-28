import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import cookie from 'react-cookies';
import { seafileAPI } from '../../utils/seafile-api';
import { gettext, canAddRepo, canViewOrg } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import toaster from '../../components/toast';
import Repo from '../../models/repo';
import Group from '../../models/group';
import Loading from '../../components/loading';
import ViewModes from '../../components/view-modes';
import ReposSortMenu from '../../components/repos-sort-menu';
import TopToolbar from '../../components/toolbar/top-toolbar';
import SingleDropdownToolbar from '../../components/toolbar/single-dropdown-toolbar';
import SortOptionsDialog from '../../components/dialog/sort-options';
import GuideForNewDialog from '../../components/dialog/guide-for-new-dialog';
import CreateRepoDialog from '../../components/dialog/create-repo-dialog';
import MylibRepoListView from '../../pages/my-libs/mylib-repo-list-view';
import SharedLibs from '../../pages/shared-libs/shared-libs';
import SharedWithAll from '../../pages/shared-with-all';
import GroupItem from '../../pages/groups/group-item';

import '../../css/files.css';

const propTypes = {
  onShowSidePanel: PropTypes.func.isRequired,
  onSearchedClick: PropTypes.func.isRequired
};

class Libraries extends Component {
  constructor(props) {
    super(props);
    this.sortOptions = [
      {value: 'name-asc', text: gettext('By name ascending')},
      {value: 'name-desc', text: gettext('By name descending')},
      {value: 'time-asc', text: gettext('By time ascending')},
      {value: 'time-desc', text: gettext('By time descending')}
    ];

    this.state = {
      // for 'my libs'
      errorMsg: '',
      isLoading: true,
      repoList: [],
      isSortOptionsDialogOpen: false,
      isGuideForNewDialogOpen: window.app.pageOptions.guideEnabled,
      groupList: [],
      sharedRepoList:[],
      publicRepoList: [],
      isCreateRepoDialogOpen: false,
      currentViewMode: localStorage.getItem('sf_repo_list_view_mode') || 'list',
      sortBy: localStorage.getItem('sf_repos_sort_by') || 'name', // 'name' or 'time'
      sortOrder: localStorage.getItem('sf_repos_sort_order') || 'asc', // 'asc' or 'desc'
    };
  }

  componentDidMount() {
    const promiseListRepos = seafileAPI.listRepos({ 'type': ['mine', 'shared', 'public'] });
    const promiseListGroups = seafileAPI.listGroups(true);
    Promise.all([promiseListRepos, promiseListGroups]).then(res => {
      const [resListRepos, resListGroups] = res;
      const repoList = resListRepos.data.repos.map((item) => new Repo(item));
      const groups = resListGroups.data.map(item => {
        let group = new Group(item);
        group.repos = item.repos.map(item => new Repo(item));
        return group;
      }).sort((a, b) => a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1 );
      const { allRepoList, myRepoList, sharedRepoList, publicRepoList, groupList } = this.sortRepos(repoList, groups);
      this.setState({
        isLoading: false,
        allRepoList,
        groupList,
        sharedRepoList,
        publicRepoList,
        repoList: myRepoList
      });
    }).catch((error) => {
      this.setState({
        isLoading: false,
        errorMsg: Utils.getErrorMsg(error, true),
      });
    });
  }

  sortRepos = (repoList, groups) => {
    const allRepoList = Utils.sortRepos(repoList, this.state.sortBy, this.state.sortOrder);
    const myRepoList = allRepoList.filter(item => item.type === 'mine');
    const sharedRepoList = allRepoList.filter(item => item.type === 'shared');
    const publicRepoList = allRepoList.filter(item => item.type === 'public');
    const groupList = groups.map(item => {
      item.repos = Utils.sortRepos(item.repos, this.state.sortBy, this.state.sortOrder);
      return item;
    });
    return { allRepoList, myRepoList, sharedRepoList, publicRepoList, groupList };
  };

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

  onSelectSortOption = (sortOption) => {
    const [sortBy, sortOrder] = sortOption.value.split('-');
    this.setState({sortBy, sortOrder}, () => {
      localStorage.setItem('sf_repos_sort_by', sortBy);
      localStorage.setItem('sf_repos_sort_order', sortOrder);
      const { allRepoList: repoList, groupList: groups } = this.state;
      const { allRepoList, myRepoList, sharedRepoList, publicRepoList, groupList } = this.sortRepos(repoList, groups);
      this.setState({
        allRepoList,
        groupList,
        sharedRepoList,
        publicRepoList,
        repoList: myRepoList
      });
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

  toggleGuideForNewDialog = () => {
    window.app.pageOptions.guideEnabled = false;
    this.setState({
      isGuideForNewDialogOpen: false
    });
  };

  // the following are for 'groups'
  /*
  onCreateGroup = (groupData) => {
    const newGroup = new Group(groupData);
    const { groupList: newList } = this.state;
    newList.unshift(newGroup);
    this.setState({
      groupList: newList
    });
  };
  */

  updateGroup = (group) => {
    const { groupList } = this.state;
    this.setState({
      groupList: groupList.map((item) => {
        if (item.id == group.id) {
          item = group;
        }
        return item;
      })
    });
  };

  toggleCreateRepoDialog = () => {
    this.setState({
      isCreateRepoDialogOpen: !this.state.isCreateRepoDialogOpen
    });
  };

  switchViewMode = (newMode) => {
    this.setState({
      currentViewMode: newMode
    }, () => {
      localStorage.setItem('sf_repo_list_view_mode', newMode);
    });
  };

  render() {
    const { isLoading, currentViewMode, sortBy, sortOrder } = this.state;
    const isDesktop = Utils.isDesktop();

    const sortOptions = this.sortOptions.map(item => {
      return {
        ...item,
        isSelected: item.value == `${sortBy}-${sortOrder}`
      };
    });
    return (
      <Fragment>
        <div className="main-panel-center flex-row">
          <div className="cur-view-container">
            <div className="cur-view-path">
              <h3 className="sf-heading m-0">{gettext('Files')}</h3>
              {isDesktop &&
              <div className="d-flex align-items-center">
                <div className="mr-2">
                  <ViewModes currentViewMode={currentViewMode} switchViewMode={this.switchViewMode} />
                </div>
                <ReposSortMenu sortOptions={sortOptions} onSelectSortOption={this.onSelectSortOption}/>
              </div>
              }
            </div>
            {isLoading ?
              <Loading /> :
              <div className="cur-view-content" id="files-content-container">

                {(Utils.isDesktop() && currentViewMode == 'list') && (
                  <table aria-hidden={true} className="my-3">
                    <thead>
                      <tr>
                        <th width="4%"></th>
                        <th width="3%"><span className="sr-only">{gettext('Library Type')}</span></th>
                        <th width="35%">{gettext('Name')}</th>
                        <th width="10%"><span className="sr-only">{gettext('Actions')}</span></th>
                        <th width="14%">{gettext('Size')}</th>
                        <th width="17%">{gettext('Last Update')}</th>
                        <th width="17%">{gettext('Owner')}</th>
                      </tr>
                    </thead>
                  </table>
                )}

                {canAddRepo && (
                  <div className="pb-3">
                    <div className={`d-flex justify-content-between mt-3 py-1 ${currentViewMode == 'list' ? 'sf-border-bottom' : ''}`}>
                      <h4 className="sf-heading m-0 d-flex align-items-center">
                        <span className="sf3-font-mine sf3-font nav-icon" aria-hidden="true"></span>
                        {gettext('My Libraries')}
                        <SingleDropdownToolbar
                          opList={[{'text': gettext('New Library'), 'onClick': this.toggleCreateRepoDialog}]}
                        />
                      </h4>
                      {(!Utils.isDesktop() && this.state.repoList.length > 0) &&
                        <span className="sf3-font sf3-font-sort action-icon" onClick={this.toggleSortOptionsDialog}></span>
                      }
                    </div>
                    {this.state.errorMsg ? <p className="error text-center mt-8">{this.state.errorMsg}</p> : (
                      this.state.repoList.length === 0 ? (
                        <p className={`libraries-empty-tip-in-${currentViewMode}-mode`}>{gettext('No libraries')}</p>
                      ) : (
                        <MylibRepoListView
                          sortBy={this.state.sortBy}
                          sortOrder={this.state.sortOrder}
                          repoList={this.state.repoList}
                          onRenameRepo={this.onRenameRepo}
                          onDeleteRepo={this.onDeleteRepo}
                          onTransferRepo={this.onTransferRepo}
                          onMonitorRepo={this.onMonitorRepo}
                          onRepoClick={this.onRepoClick}
                          sortRepoList={this.sortRepoList}
                          inAllLibs={true}
                          currentViewMode={currentViewMode}
                        />
                      ))
                    }
                  </div>
                )}
                <div className="pb-3">
                  <SharedLibs
                    repoList={this.state.sharedRepoList}
                    inAllLibs={true}
                    currentViewMode={currentViewMode}
                  />
                </div>
                {canViewOrg &&
                  <div className="pb-3">
                    <SharedWithAll
                      repoList={this.state.publicRepoList}
                      inAllLibs={true}
                      currentViewMode={currentViewMode}
                    />
                  </div>
                }
                <div className="group-list-panel">
                  {this.state.groupList.length > 0 && (
                    this.state.groupList.map((group, index) => {
                      return (
                        <GroupItem
                          key={index}
                          group={group}
                          updateGroup={this.updateGroup}
                          currentViewMode={currentViewMode}
                        />
                      );
                    })
                  )}
                </div>
              </div>
            }
          </div>
          {!isLoading && !this.state.errorMsg && this.state.isGuideForNewDialogOpen &&
            <GuideForNewDialog
              toggleDialog={this.toggleGuideForNewDialog}
            />
          }
          {this.state.isSortOptionsDialogOpen &&
            <SortOptionsDialog
              toggleDialog={this.toggleSortOptionsDialog}
              sortBy={this.state.sortBy}
              sortOrder={this.state.sortOrder}
              sortItems={this.sortRepoList}
            />
          }
          {this.state.isCreateRepoDialogOpen && (
            <CreateRepoDialog
              libraryType='mine'
              onCreateRepo={this.onCreateRepo}
              onCreateToggle={this.toggleCreateRepoDialog}
            />
          )}
        </div>
      </Fragment>
    );
  }
}

Libraries.propTypes = propTypes;

export default Libraries;
