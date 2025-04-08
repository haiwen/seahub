import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import cookie from 'react-cookies';
import classnames from 'classnames';
import { navigate } from '@gatsbyjs/reach-router';
import { gettext, siteRoot, username } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import Loading from '../../components/loading';
import EmptyTip from '../../components/empty-tip';
import toaster from '../../components/toast';
import { Group, Repo } from '../../models';
import SharedRepoListView from '../../components/shared-repo-list-view/shared-repo-list-view';
import SortOptionsDialog from '../../components/dialog/sort-options';
import ViewModes from '../../components/view-modes';
import ReposSortMenu from '../../components/sort-menu';
import { LIST_MODE } from '../../components/dir-view-mode/constants';
import GroupOperationMenu from './group-op-menu';

import '../../css/group-view.css';

const propTypes = {
  groupID: PropTypes.string
};

class GroupView extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isLoading: true, // first loading
      isLoadingMore: false,
      errMessage: '',
      emptyTip: null,
      currentGroup: null,
      currentViewMode: localStorage.getItem('sf_repo_list_view_mode') || LIST_MODE,
      sortBy: cookie.load('seafile-repo-dir-sort-by') || 'name', // 'name' or 'time' or 'size'
      sortOrder: cookie.load('seafile-repo-dir-sort-order') || 'asc', // 'asc' or 'desc'
      isSortOptionsDialogOpen: false,
      repoList: [],
      currentPage: 1,
      perPage: 300,
      hasNextPage: false,
      isDepartmentGroup: false,
    };
  }

  componentDidMount() {
    this.loadGroup(this.props.groupID);
  }

  UNSAFE_componentWillReceiveProps(nextProps) {
    if (nextProps.groupID !== this.props.groupID) {
      this.loadGroup(nextProps.groupID);
    }
  }

  loadGroup = (groupID) => {
    seafileAPI.getGroup(groupID).then((res) => {
      let currentGroup = new Group(res.data);
      this.setState({
        emptyTip: this.getEmptyTip(currentGroup),
        currentGroup,
        isDepartmentGroup: currentGroup.parent_group_id !== 0,
        currentPage: 1,
        repoList: [] // empty it for the current group
      }, () => {
        this.loadRepos(this.state.currentPage);
      });
    }).catch((error) => {
      this.setState({
        isLoading: false,
        errMessage: Utils.getErrorMsg(error, true) // true: show login tip if 403
      });
    });
  };

  loadRepos = (page) => {
    const { perPage } = this.state;
    seafileAPI.listGroupRepos(this.props.groupID, page, perPage).then((res) => {
      let hasNextPage = true;
      if (res.data.length < perPage) {
        hasNextPage = false;
      }
      let repoList = this.state.repoList;
      let newRepoList = res.data.map(item => {
        let repo = new Repo(item);
        return repo;
      });
      if (newRepoList.length) {
        repoList = repoList.concat(newRepoList);
      }
      this.setState({
        isLoading: false,
        isLoadingMore: false,
        currentPage: page,
        hasNextPage: hasNextPage,
        repoList: Utils.sortRepos(repoList, this.state.sortBy, this.state.sortOrder)
      });
    }).catch((error) => {
      this.setState({
        isLoading: false,
        isLoadingMore: false,
        errMessage: Utils.getErrorMsg(error, true) // true: show login tip if 403
      });
    });
  };

  getEmptyTip = (currentGroup) => {
    if (currentGroup) {
      if (currentGroup.parent_group_id === 0) {
        return (
          <EmptyTip
            title={gettext('No libraries shared with this group')}
            text={gettext('No libraries have been shared with this group yet. A library shared with a group can be accessed by all group members. You can share a library with a group in "My Libraries". You can also create a new library to be shared with this group by clicking the "New Library" item in the dropdown menu.')}
          />
        );
      } else {
        if (currentGroup.admins.indexOf(username) == -1) { // is a member of this group
          return (
            <EmptyTip title={gettext('No libraries')} />
          );
        } else {
          return (
            <EmptyTip
              title={gettext('No libraries')}
              text={gettext('You can create libraries by clicking the "New Library" item in the dropdown menu.')}
            />
          );
        }
      }
    }
    return null;
  };

  onItemDelete = (repo) => {
    let repoList = this.state.repoList.filter(item => {
      return item.repo_id !== repo.repo_id;
    });
    this.setState({ repoList: repoList });
    this.loadGroup(this.props.groupID);
  };

  onItemTransfer = (repoId, groupID, owner) => {
    let repoList = this.state.repoList.filter(item => {
      return item.repo_id !== repoId;
    });
    this.setState({ repoList: repoList });
    this.loadGroup(this.props.groupID);
  };

  onItemUnshare = (repo) => {
    let group = this.state.currentGroup;
    seafileAPI.unshareRepoToGroup(repo.repo_id, group.id).then(() => {
      let repoList = this.state.repoList.filter(item => {
        return item.repo_id !== repo.repo_id;
      });
      this.setState({ repoList: repoList });
      this.loadGroup(group.id);
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  onItemRename = (repo, newName) => {
    seafileAPI.renameGroupOwnedLibrary(this.props.groupID, repo.repo_id, newName).then(res => {
      let repoList = this.state.repoList.map(item => {
        if (item.repo_id === repo.repo_id) {
          item.repo_name = newName;
        }
        return item;
      });
      this.setState({ repoList: repoList });
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
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

  sortItems = (sortBy, sortOrder) => {
    cookie.save('seafile-repo-dir-sort-by', sortBy);
    cookie.save('seafile-repo-dir-sort-order', sortOrder);
    this.setState({
      sortBy,
      sortOrder,
      repoList: Utils.sortRepos(this.state.repoList, sortBy, sortOrder)
    });
  };

  toggleSortOptionsDialog = () => {
    this.setState({
      isSortOptionsDialogOpen: !this.state.isSortOptionsDialogOpen
    });
  };

  handleScroll = (event) => {
    // isLoadingMore: to avoid repeated request
    const { currentPage, hasNextPage, isLoadingMore } = this.state;
    if (hasNextPage && !isLoadingMore) {
      const clientHeight = event.target.clientHeight;
      const scrollHeight = event.target.scrollHeight;
      const scrollTop = event.target.scrollTop;
      const isBottom = (clientHeight + scrollTop + 1 >= scrollHeight);
      if (isBottom) { // scroll to the bottom
        this.setState({ isLoadingMore: true }, () => {
          this.loadRepos(currentPage + 1);
        });
      }
    }
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
      this.sortItems(sortBy, sortOrder);
    });
  };

  addNewRepo = (newRepo) => {
    let { repoList } = this.state;
    repoList.unshift(newRepo);
    this.setState({ repoList: repoList });
  };

  onGroupNameChanged = (newName) => {
    const { currentGroup } = this.state;
    currentGroup.name = newName;
    this.setState({
      currentGroup: currentGroup
    });
  };

  onGroupTransfered = (group) => {
    this.setState({
      currentGroup: group
    });
  };

  onGroupDeleted = () => {
    navigate(siteRoot);
  };

  onLeavingGroup = () => {
    navigate(siteRoot);
  };

  render() {
    const {
      isLoading, repoList, errMessage, emptyTip,
      currentGroup, isDepartmentGroup,
      currentViewMode, sortBy, sortOrder
    } = this.state;

    let useRate = 0;
    if (isDepartmentGroup && currentGroup.group_quota) {
      useRate = currentGroup.group_quota_usage / currentGroup.group_quota * 100 + '%';
    }

    return (
      <Fragment>
        <div className="main-panel-center flex-row">
          <div className="cur-view-container">
            <div className="cur-view-path">
              {currentGroup && (
                <Fragment>
                  <div className="sf-heading d-flex align-items-center">
                    {isDepartmentGroup &&
                    <span className="sf3-font-department sf3-font nav-icon" title={gettext('This is a special group representing a department.')}></span>
                    }
                    <span>{currentGroup.name}</span>
                    <GroupOperationMenu
                      group={currentGroup}
                      addNewRepo={this.addNewRepo}
                      onGroupNameChanged={this.onGroupNameChanged}
                      onGroupTransfered={this.onGroupTransfered}
                      onGroupDeleted={this.onGroupDeleted}
                      onLeavingGroup={this.onLeavingGroup}
                    />
                  </div>
                  <div className="path-tool d-flex align-items-center">
                    {isDepartmentGroup && (
                      <>
                        {currentGroup.group_quota > 0 &&
                          <div className="department-usage-container mr-3">
                            <div className="department-usage">
                              <span id="quota-bar" className="department-quota-bar"><span id="quota-usage" className="usage" style={{ width: useRate }}></span></span>
                              <span className="department-quota-info">{Utils.bytesToSize(currentGroup.group_quota_usage)} / {Utils.bytesToSize(currentGroup.group_quota)}</span>
                            </div>
                          </div>
                        }
                      </>
                    )}
                    {Utils.isDesktop() && (
                      <div className="d-flex align-items-center">
                        <div className="mr-2">
                          <ViewModes currentViewMode={currentViewMode} switchViewMode={this.switchViewMode} />
                        </div>
                        <ReposSortMenu sortBy={sortBy} sortOrder={sortOrder} onSelectSortOption={this.onSelectSortOption}/>
                      </div>
                    )}
                    {(!Utils.isDesktop() && this.state.repoList.length > 0) &&
                      <span className="sf3-font sf3-font-sort action-icon" onClick={this.toggleSortOptionsDialog}></span>}
                    {this.state.isSortOptionsDialogOpen &&
                    <SortOptionsDialog
                      sortBy={sortBy}
                      sortOrder={sortOrder}
                      sortItems={this.sortItems}
                      toggleDialog={this.toggleSortOptionsDialog}
                    />
                    }
                  </div>
                </Fragment>
              )}
            </div>
            <div
              className={classnames('cur-view-content', 'd-block', 'repos-container', { 'pt-3': currentViewMode != LIST_MODE })}
              onScroll={this.handleScroll}
            >
              {isLoading
                ? <Loading />
                : errMessage
                  ? <p className="error text-center mt-2">{errMessage}</p>
                  : repoList.length == 0
                    ? emptyTip
                    : (
                      <SharedRepoListView
                        repoList={this.state.repoList}
                        hasNextPage={this.state.hasNextPage}
                        currentGroup={this.state.currentGroup}
                        sortBy={this.state.sortBy}
                        sortOrder={this.state.sortOrder}
                        sortItems={this.sortItems}
                        onItemUnshare={this.onItemUnshare}
                        onItemDelete={this.onItemDelete}
                        onItemRename={this.onItemRename}
                        onMonitorRepo={this.onMonitorRepo}
                        onTransferRepo={this.onItemTransfer}
                        currentViewMode={currentViewMode}
                      />
                    )
              }
            </div>
          </div>
        </div>
      </Fragment>
    );
  }
}

GroupView.propTypes = propTypes;

export default GroupView;
