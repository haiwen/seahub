import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import cookie from 'react-cookies';
import { seafileAPI } from '../../utils/seafile-api';
import { gettext, canAddRepo, canViewOrg, canAddGroup } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import toaster from '../../components/toast';
import Repo from '../../models/repo';
import Group from '../../models/group';
import Loading from '../../components/loading';
import TopToolbar from '../../components/toolbar/top-toolbar';
import MyLibsToolbar from '../../components/toolbar/my-libs-toolbar';
import GroupsToolbar from '../../components/toolbar/groups-toolbar';
import SortOptionsDialog from '../../components/dialog/sort-options';
import GuideForNewDialog from '../../components/dialog/guide-for-new-dialog';
import MylibRepoListView from '../../pages/my-libs/mylib-repo-list-view';
import SharedLibs from '../../pages/shared-libs/shared-libs.js';
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
    this.state = {
      // for 'my libs'
      errorMsg: '',
      isLoading: true,
      repoList: [],
      isSortOptionsDialogOpen: false,
      sortBy: cookie.load('seafile-repo-dir-sort-by') || 'name', // 'name' or 'time' or 'size'
      sortOrder: cookie.load('seafile-repo-dir-sort-order') || 'asc', // 'asc' or 'desc'

      isGuideForNewDialogOpen: window.app.pageOptions.guideEnabled,

      // for 'groups'
      isGroupsLoading: true,
      groupsErrorMsg: '',
      groupList: [],

      // for 'shared'
      sharedRepoList:[],
      isSharedLoading: true,

      // for 'public'
      publicRepoList: [],
      isPublicLoading: true,
    };
  }

  componentDidMount() {
    this.listMyLibs();
    this.listGroups();
  }

  listMyLibs = () => {
    seafileAPI.listRepos({'type':['mine', 'shared', 'public']}).then((res) => {
      let allRepoList = res.data.repos.map((item) => {
        return new Repo(item);
      });
      let myRepoList = allRepoList.filter(item => {
        return item.type === 'mine';
      });
      let sharedRepoList = allRepoList.filter(item => {
        return item.type === 'shared';
      });
      let publicRepoList = allRepoList.filter(item => {
        return item.type === 'public';
      });
      this.setState({
        isLoading: false,
        sharedRepoList: sharedRepoList,
        publicRepoList: publicRepoList,
        repoList: Utils.sortRepos(myRepoList, this.state.sortBy, this.state.sortOrder),
      },() => {
        this.setState({
          isSharedLoading: false,
          isPublicLoading: false
        });
      });
    }).catch((error) => {
      this.setState({
        isLoading: false,
        errorMsg: Utils.getErrorMsg(error, true), // true: show login tip if 403
      });
    });
  };

  toggleSortOptionsDialog = () => {
    this.setState({
      isSortOptionsDialogOpen: !this.state.isSortOptionsDialogOpen
    });
  };

  onCreateRepo = (repo) => {
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

  toggleGuideForNewDialog = () => {
    window.app.pageOptions.guideEnabled = false;
    this.setState({
      isGuideForNewDialogOpen: false
    });
  };

  // the following are for 'groups'
  listGroups = () => {
    seafileAPI.listGroups(true).then((res) => {
      // `{'with_repos': 1}`: list repos of every group
      let groupList = res.data.map(item => {
        let group = new Group(item);
        group.repos = item.repos.map(item => {
          return new Repo(item);
        });
        return group;
      });
      this.setState({
        isGroupsLoading: false,
        groupList: groupList.sort((a, b) => {
          return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1;
        })
      });
    }).catch((error) => {
      this.setState({
        isGroupsLoading: false,
        groupsErrorMsg: Utils.getErrorMsg(error, true) // true: show login tip if 403
      });
    });
  };

  onCreateGroup = (groupData) => {
    const newGroup = new Group(groupData);
    const { groupList: newList } = this.state;
    newList.unshift(newGroup);
    this.setState({
      groupList: newList
    });
  };

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

  render() {

    return (
      <Fragment>
        <TopToolbar
          onShowSidePanel={this.props.onShowSidePanel}
          onSearchedClick={this.props.onSearchedClick}
        >
          <>
            {canAddRepo && <MyLibsToolbar onCreateRepo={this.onCreateRepo} />}
            {canAddGroup && <GroupsToolbar onCreateGroup={this.onCreateGroup} />}
          </>
        </TopToolbar>
        <div className="main-panel-center flex-row">
          <div className="cur-view-container">
            <div className="cur-view-path">
              <h3 className="sf-heading m-0">{gettext('Files')}</h3>
            </div>
            <div className="cur-view-content" id="files-content-container">

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

              {canAddRepo && (
                <div className="pb-3">
                  <div className="d-flex justify-content-between mt-3 py-1 sf-border-bottom">
                    <h4 className="sf-heading m-0">
                      <span className="sf3-font-mine sf3-font nav-icon" aria-hidden="true"></span>
                      {gettext('My Libraries')}
                    </h4>
                    {(!Utils.isDesktop() && this.state.repoList.length > 0) && <span className="sf3-font sf3-font-sort action-icon" onClick={this.toggleSortOptionsDialog}></span>}
                  </div>
                  {this.state.isLoading ? <Loading /> : (
                    this.state.errorMsg ? <p className="error text-center mt-8">{this.state.errorMsg}</p> : (
                      this.state.repoList.length === 0 ? (
                        <p className="libraries-empty-tip">{gettext('No libraries')}</p>
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
                        />
                      )))}
                </div>
              )}

              <div className="pb-3">
                {!this.state.isSharedLoading &&
                  <SharedLibs
                    inAllLibs={true}
                    repoList={this.state.sharedRepoList} />
                }
              </div>

              {canViewOrg && !this.state.isPublicLoading && (
                <div className="pb-3">
                  <SharedWithAll
                    inAllLibs={true}
                    repoList={this.state.publicRepoList}
                  />
                </div>
              )}

              <div className="group-list-panel">
                {this.state.isGroupsLoading? <Loading /> : (
                  this.state.groupsErrorMsg ? <p className="error text-center mt-8">{this.state.groupsErrorMsg}</p> : (
                    this.state.groupList.length > 0 && (
                      this.state.groupList.map((group, index) => {
                        return (
                          <GroupItem
                            key={index}
                            group={group}
                            updateGroup={this.updateGroup}
                          />
                        );
                      })
                    )))}
              </div>

            </div>
          </div>
          {!this.state.isLoading && !this.state.errorMsg && this.state.isGuideForNewDialogOpen &&
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
        </div>
      </Fragment>
    );
  }
}

Libraries.propTypes = propTypes;

export default Libraries;
