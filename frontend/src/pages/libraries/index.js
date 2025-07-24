import React, { Component } from 'react';
import cookie from 'react-cookies';
import { Utils } from '../../utils/utils';
import { seafileAPI } from '../../utils/seafile-api';
import { gettext, canAddRepo, canViewOrg, enableOCM, enableOCMViaWebdav } from '../../utils/constants';
import Repo from '../../models/repo';
import Group from '../../models/group';
import toaster from '../../components/toast';
import Loading from '../../components/loading';
import ViewModes from '../../components/view-modes';
import ReposSortMenu from '../../components/sort-menu';
import SingleDropdownToolbar from '../../components/toolbar/single-dropdown-toolbar';
import SortOptionsDialog from '../../components/dialog/sort-options';
import GuideForNewDialog from '../../components/dialog/guide-for-new-dialog';
import CreateRepoDialog from '../../components/dialog/create-repo-dialog';
import MylibRepoListView from '../../pages/my-libs/mylib-repo-list-view';
import SharedLibraries from '../../pages/shared-libs';
import SharedWithAll from '../../pages/shared-with-all';
import ShareWithOCM from '../../pages/share-with-ocm/shared-with-ocm';
import OCMViaWebdav from '../../pages/ocm-via-webdav/ocm-via-webdav';
import GroupItem from '../../pages/groups/group-item';
import { GroupsReposManager } from './groups-repos-manager';
import EventBus from '../../components/common/event-bus';
import { EVENT_BUS_TYPE } from '../../components/common/event-bus-type';
import { LIST_MODE } from '../../components/dir-view-mode/constants';

import '../../css/files.css';

class Libraries extends Component {

  constructor(props) {
    super(props);
    this.state = {
      // for 'my libs'
      errorMsg: '',
      isLoading: true,
      repoList: [],
      isSortOptionsDialogOpen: false,
      isGuideForNewDialogOpen: window.app.pageOptions.guideEnabled,
      groupList: [],
      sharedRepoList: [],
      publicRepoList: [],
      isCreateRepoDialogOpen: false,
      currentViewMode: localStorage.getItem('sf_repo_list_view_mode') || LIST_MODE,
      sortBy: localStorage.getItem('sf_repos_sort_by') || 'name', // 'name' or 'time'
      sortOrder: localStorage.getItem('sf_repos_sort_order') || 'asc', // 'asc' or 'desc'
    };

    this.groupsReposManager = new GroupsReposManager();
  }

  componentDidMount() {
    this.initLibraries();

    const eventBus = EventBus.getInstance();
    this.unsubscribeAddNewGroup = eventBus.subscribe(EVENT_BUS_TYPE.ADD_NEW_GROUP, this.addNewGroup);
    this.unsubscribeAddSharedRepoIntoGroup = eventBus.subscribe(EVENT_BUS_TYPE.ADD_SHARED_REPO_INTO_GROUP, this.addRepoToGroup);
    this.unsubscribeUnsharedRepoToGroup = eventBus.subscribe(EVENT_BUS_TYPE.UN_SHARE_REPO_TO_GROUP, this.unshareRepoToGroup);
  }

  componentWillUnmount() {
    this.unsubscribeAddNewGroup();
    this.unsubscribeAddSharedRepoIntoGroup();
    this.unsubscribeUnsharedRepoToGroup();
  }


  initLibraries = () => {
    const promiseListRepos = seafileAPI.listRepos({ 'type': ['mine', 'shared', 'public'] });
    const promiseListGroups = seafileAPI.listGroups(true);
    Promise.all([promiseListRepos, promiseListGroups]).then(res => {
      const [resListRepos, resListGroups] = res;
      const repoList = resListRepos.data.repos.map((item) => new Repo(item));
      let groups = resListGroups.data.map(item => {
        let group = new Group(item);
        group.repos = item.repos.map(item => new Repo(item));
        return group;
      });
      groups = this.sortGroups(groups);
      this.groupsReposManager.init(groups);
      const { allRepoList, myRepoList, sharedRepoList, publicRepoList, groupList } = this.sortRepos(repoList, groups);
      this.setState({
        isLoading: false,
        allRepoList,
        groupList,
        sharedRepoList,
        publicRepoList,
        repoList: myRepoList,
      });
    }).catch((error) => {
      this.setState({
        isLoading: false,
        errorMsg: Utils.getErrorMsg(error, true),
      });
    });
  };

  sortGroups = (groups) => {
    if (!Array.isArray(groups) || groups.length === 0) {
      return [];
    }
    return groups.sort((a, b) => a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1);
  };

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
      this.setState({ repoList: this.state.repoList });
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  onSelectSortOption = (sortOption) => {
    const [sortBy, sortOrder] = sortOption.value.split('-');
    this.sortReposByOption(sortBy, sortOrder);
  };

  sortReposByOption = (sortBy, sortOrder) => {
    this.setState({ sortBy, sortOrder }, () => {
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

  toggleSortOrder = (sortBy, e) => {
    e.preventDefault();
    const sortOrder = this.state.sortOrder == 'asc' ? 'desc' : 'asc';
    this.sortReposByOption(sortBy, sortOrder);
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

  onGroupTransferRepo = (repoID, oldGroupID, newOwner) => {
    let newGroupID = parseInt(newOwner.split('@')[0]);
    let repoToMove = null;
    const updatedGroups = this.state.groupList.map(group => {
      if (group.id === oldGroupID) {
        group.repos = group.repos.filter(repo => {
          if (repo.repo_id === repoID) {
            repoToMove = repo;
            return false;
          }
          return true;
        });
      }
      return group;
    });
    if (repoToMove) {
      updatedGroups.forEach(group => {
        if (group.id === newGroupID) {
          group.repos.push(repoToMove);
        }
      });
      this.groupsReposManager.remove(repoID, oldGroupID);
      this.groupsReposManager.add(repoID, newGroupID);
    }
    this.setState({ groupList: updatedGroups });
  };

  renameRepo = (repoId, newName, repoList) => {
    if (!Array.isArray(repoList) || repoList.length === 0) {
      return repoList;
    }
    let updatedRepoList = repoList.map((repo) => {
      if (repo.repo_id === repoId) {
        return { ...repo, repo_name: newName };
      }
      return repo;
    });
    return Utils.sortRepos(updatedRepoList, this.state.sortBy, this.state.sortOrder);
  };

  onRenameRepo = (repo, newName) => {
    const targetRepoId = repo.repo_id;
    const repoList = this.renameRepo(targetRepoId, newName, this.state.repoList);
    this.renameRelatedGroupsRepos(targetRepoId, newName);
    this.setState({ repoList });
  };

  monitorRepo = (repoId, monitored, repoList) => {
    if (!Array.isArray(repoList) || repoList.length === 0) {
      return repoList;
    }
    return repoList.map((repo) => {
      if (repo.repo_id === repoId) {
        return { ...repo, monitored };
      }
      return repo;
    });
  };

  onMonitorRepo = (repo, monitored) => {
    const targetRepoId = repo.repo_id;
    const repoList = this.monitorRepo(targetRepoId, monitored, this.state.repoList);
    this.monitorRelatedGroupsRepos(targetRepoId, monitored);
    this.setState({ repoList });
  };

  deleteRepo = (repoId, repoList) => {
    if (!Array.isArray(repoList) || repoList.length === 0) {
      return repoList;
    }
    return repoList.filter((repo) => repo.repo_id !== repoId);
  };

  onDeleteRepo = (repo) => {
    const targetRepoId = repo.repo_id;
    const repoList = this.deleteRepo(targetRepoId, this.state.repoList);
    this.deleteRelatedGroupsRepos(targetRepoId);
    this.setState({ repoList: repoList });
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

  addRepoToGroup = ({ repo, group_id }) => {
    if (!repo) {
      return;
    }

    const { groupList } = this.state;
    let newGroupList = [...groupList];
    let targetGroup = newGroupList.find((group) => group.id === group_id);
    if (!targetGroup) {
      return;
    }
    const isExist = targetGroup.repos.findIndex((currRepo) => currRepo.repo_id === repo.repo_id) > -1;
    if (isExist) {
      return;
    }

    targetGroup.repos.unshift(repo);
    this.groupsReposManager.add(repo.repo_id, group_id);
    this.setState({ groupList: newGroupList });
  };

  onGroupNameChanged = (newName, groupID) => {
    const { groupList } = this.state;
    let newGroupList = [...groupList];
    let targetGroup = newGroupList.find((group) => group.id === groupID);
    targetGroup.name = newName;
    this.setState({ groupList: newGroupList });
  };

  onGroupTransfered = (group) => {
    const { groupList } = this.state;
    let newGroupList = [...groupList];
    let targetGroup = newGroupList.find((item) => item.id === group.id);
    targetGroup.owner = group.owner;
    targetGroup.admins = group.admins;
    this.setState({ groupList: newGroupList });
  };

  onGroupDeleted = (groupID) => {
    const { groupList } = this.state;
    this.setState({ groupList: groupList.filter(item => item.id != groupID) });
  };

  onLeavingGroup = (groupID) => {
    const { groupList } = this.state;
    this.setState({ groupList: groupList.filter(item => item.id != groupID) });
  };

  unshareRepoToGroup = ({ repo_id, group_id }) => {
    const { groupList } = this.state;
    let newGroupList = [...groupList];
    let targetGroup = newGroupList.find((group) => group.id === group_id);
    if (!targetGroup) {
      return;
    }
    targetGroup.repos = targetGroup.repos.filter((repo) => repo.repo_id !== repo_id);
    this.groupsReposManager.remove(repo_id, group_id);
    this.setState({ groupList: newGroupList });
  };

  renameRelatedGroupsRepos = (repoId, newName) => {
    const relatedGroups = this.groupsReposManager.getRepoInGroupsIdsById(repoId);
    if (relatedGroups.length === 0) {
      return;
    }

    const { groupList } = this.state;
    const updatedGroups = groupList.map((group) => {
      const { repos } = group;
      if (!relatedGroups.includes(group.id)) {
        return group;
      }
      const updatedRepos = this.renameRepo(repoId, newName, repos);
      return { ...group, repos: updatedRepos };
    });
    this.setState({ groupList: updatedGroups });
  };

  monitorRelatedGroupsRepos = (repoId, monitored) => {
    const relatedGroups = this.groupsReposManager.getRepoInGroupsIdsById(repoId);
    if (relatedGroups.length === 0) {
      return;
    }

    const { groupList } = this.state;
    const updatedGroups = groupList.map((group) => {
      const { repos } = group;
      if (!relatedGroups.includes(group.id)) {
        return group;
      }
      const updatedRepos = this.monitorRepo(repoId, monitored, repos);
      return { ...group, repos: updatedRepos };
    });
    this.setState({ groupList: updatedGroups });
  };

  deleteRelatedGroupsRepos = (repoId) => {
    const relatedGroups = this.groupsReposManager.getRepoInGroupsIdsById(repoId);
    if (relatedGroups.length === 0) {
      return;
    }

    const { groupList } = this.state;
    const updatedGroups = groupList.map((group) => {
      const { repos } = group;
      if (!relatedGroups.includes(group.id)) {
        return group;
      }
      const updatedRepos = this.deleteRepo(repoId, repos);
      return { ...group, repos: updatedRepos };
    });

    this.groupsReposManager.removeRepo(repoId);
    this.setState({ groupList: updatedGroups });
  };

  addNewGroup = ({ group }) => {
    const { groupList } = this.state;
    let newGroupList = [...groupList];
    newGroupList.push(group);
    newGroupList = this.sortGroups(newGroupList);
    this.setState({ groupList: newGroupList });
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
    const { isLoading, currentViewMode, sortBy, sortOrder, groupList } = this.state;
    const isDesktop = Utils.isDesktop();
    const sortIcon = sortOrder === 'asc' ? <span className="sf3-font sf3-font-down rotate-180 d-inline-block"></span> : <span className="sf3-font sf3-font-down"></span>;

    return (
      <>
        <div className="main-panel-center flex-row">
          <div className="cur-view-container">
            <div className="cur-view-path">
              <h3 className="sf-heading m-0">{gettext('Files')}</h3>
              {isDesktop &&
              <div className="d-flex align-items-center">
                <div className="mr-2">
                  <ViewModes currentViewMode={currentViewMode} switchViewMode={this.switchViewMode} />
                </div>
                <ReposSortMenu sortBy={sortBy} sortOrder={sortOrder} onSelectSortOption={this.onSelectSortOption} />
              </div>
              }
            </div>
            <div className="cur-view-content repos-container" id="files-content-container">
              {isLoading ? <Loading /> : (
                <>
                  {(Utils.isDesktop() && currentViewMode == LIST_MODE) && (
                    <table className="my-3">
                      <thead>
                        <tr>
                          <th width="4%"></th>
                          <th width="3%"><span className="sr-only">{gettext('Library Type')}</span></th>
                          <th width="35%"><a className="d-block table-sort-op" href="#" onClick={this.toggleSortOrder.bind(this, 'name')}>{gettext('Name')} {sortBy === 'name' && sortIcon}</a></th>
                          <th width="10%"><span className="sr-only">{gettext('Actions')}</span></th>
                          <th width="14%"><a className="d-block table-sort-op" href="#" onClick={this.toggleSortOrder.bind(this, 'size')}>{gettext('Size')} {sortBy === 'size' && sortIcon}</a></th>
                          <th width="17%"><a className="d-block table-sort-op" href="#" onClick={this.toggleSortOrder.bind(this, 'time')}>{gettext('Last Update')} {sortBy === 'time' && sortIcon}</a></th>
                          <th width="17%">{gettext('Owner')}</th>
                        </tr>
                      </thead>
                    </table>
                  )}

                  {canAddRepo && (
                    <div className="pb-3">
                      <div className={`d-flex justify-content-between mt-3 py-1 ${currentViewMode == LIST_MODE ? 'sf-border-bottom' : ''}`}>
                        <h4 className="sf-heading m-0 d-flex align-items-center">
                          <span className="sf3-font-mine sf3-font nav-icon" aria-hidden="true"></span>
                          {gettext('My Libraries')}
                          <SingleDropdownToolbar
                            withPlusIcon={true}
                            opList={[{ 'text': gettext('New Library'), 'onClick': this.toggleCreateRepoDialog }]}
                          />
                        </h4>
                        {(!Utils.isDesktop() && this.state.repoList.length > 0) &&
                          <span className="sf3-font sf3-font-sort action-icon" onClick={this.toggleSortOptionsDialog}></span>
                        }
                      </div>
                      {this.state.errorMsg
                        ? <p className="error text-center mt-8">{this.state.errorMsg}</p>
                        : this.state.repoList.length == 0
                          ? <p className={`libraries-empty-tip-in-${currentViewMode}-mode`}>{gettext('No libraries')}</p>
                          : (
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
                          )
                      }
                    </div>
                  )}

                  <div className="pb-3">
                    <SharedLibraries
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

                  {enableOCM &&
                  <div className="pb-3">
                    <ShareWithOCM
                      inAllLibs={true}
                      currentViewMode={currentViewMode}
                    />
                  </div>
                  }

                  {enableOCMViaWebdav &&
                  <div className="pb-3">
                    <OCMViaWebdav
                      inAllLibs={true}
                      currentViewMode={currentViewMode}
                    />
                  </div>
                  }

                  {groupList.length > 0 && groupList.map((group) => {
                    return (
                      <GroupItem
                        key={group.id}
                        inAllLibs={true}
                        group={group}
                        onMonitorRepo={this.onMonitorRepo}
                        renameRelatedGroupsRepos={this.renameRelatedGroupsRepos}
                        deleteRelatedGroupsRepos={this.deleteRelatedGroupsRepos}
                        addRepoToGroup={this.addRepoToGroup}
                        onGroupNameChanged={this.onGroupNameChanged}
                        onGroupTransfered={this.onGroupTransfered}
                        onGroupDeleted={this.onGroupDeleted}
                        onLeavingGroup={this.onLeavingGroup}
                        unshareRepoToGroup={this.unshareRepoToGroup}
                        onTransferRepo={this.onGroupTransferRepo}
                        currentViewMode={currentViewMode}
                      />
                    );
                  })}
                </>
              )}
            </div>
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
      </>
    );
  }
}

export default Libraries;
