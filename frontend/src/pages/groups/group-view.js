import React,{ Fragment } from 'react';
import { Popover } from 'reactstrap';
import PropTypes from 'prop-types';
import cookie from 'react-cookies';
import { gettext, siteRoot, username, loginUrl, canAddRepo } from '../../utils/constants';
import { Link } from '@reach/router';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import Loading from '../../components/loading';
import EmptyTip from '../../components/empty-tip';
import ModalPortal from '../../components/modal-portal';
import Group from '../../models/group';
import Repo from '../../models/repo';
import toaster from '../../components/toast';
import CommonToolbar from '../../components/toolbar/common-toolbar';
import CreateRepoDialog from '../../components/dialog/create-repo-dialog';
// import CreateDepartmentRepoDialog from '../../components/dialog/create-department-repo-dialog';
import DismissGroupDialog from '../../components/dialog/dismiss-group-dialog';
import RenameGroupDialog from '../../components/dialog/rename-group-dialog';
import TransferGroupDialog from '../../components/dialog/transfer-group-dialog';
// import ImportMembersDialog from '../../components/dialog/import-members-dialog';
import ManageMembersDialog from '../../components/dialog/manage-members-dialog';
import LeaveGroupDialog from '../../components/dialog/leave-group-dialog';
import SharedRepoListView from '../../components/shared-repo-list-view/shared-repo-list-view';
import LibDetail from '../../components/dirent-detail/lib-details';
import SortOptionsDialog from '../../components/dialog/sort-options';

import '../../css/group-view.css';

const propTypes = {
  onShowSidePanel: PropTypes.func.isRequired,
  onSearchedClick: PropTypes.func.isRequired,
  onGroupChanged: PropTypes.func.isRequired,
  onTabNavClick: PropTypes.func.isRequired,
  groupID: PropTypes.string,
};

class GroupView extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isLoading: true,
      errMessage: '',
      emptyTip: null,
      currentGroup: null,
      currentRepo: null,
      isStaff: false,
      isOwner: false,
      sortBy: cookie.load('seafile-repo-dir-sort-by') || 'name', // 'name' or 'time' or 'size'
      sortOrder: cookie.load('seafile-repo-dir-sort-order') || 'asc', // 'asc' or 'desc'
      isSortOptionsDialogOpen: false,
      repoList: [],
      libraryType: 'group',
      isCreateRepoDialogShow: false,
      isDepartmentGroup: false,
      showGroupDropdown: false,
      showGroupMembersPopover: false,
      showRenameGroupDialog: false,
      showDismissGroupDialog: false,
      showTransferGroupDialog: false,
      // showImportMembersDialog: false,
      showManageMembersDialog: false,
      groupMembers: [],
      isShowDetails: false,
      isLeaveGroupDialogOpen: false,
    };
  }

  componentDidMount() {
    let groupID = this.props.groupID;
    this.loadGroup(groupID);
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.groupID !== this.props.groupID) {
      this.loadGroup(nextProps.groupID);
    }
  }

  loadGroup = (groupID) => {
    seafileAPI.getGroup(groupID).then((res) => {
      let currentGroup = new Group(res.data);
      let emptyTip = this.getEmptyTip(currentGroup);
      let isStaff  = currentGroup.admins.indexOf(username) > -1;  //for item operations
      let isOwner = currentGroup.owner === username ? true : false;
      let isDepartmentGroup = currentGroup.parent_group_id !== 0;
      this.setState({
        emptyTip: emptyTip,
        currentGroup: currentGroup,
        isStaff: isStaff,
        isDepartmentGroup: isDepartmentGroup,
        isOwner: isOwner,
      });
      this.loadRepos(groupID);
    }).catch((error) => {
      if (error.response) {
        if (error.response.status == 403) {
          this.setState({
            isLoading: false,
            errMessage: gettext('Permission denied')
          });
          location.href = `${loginUrl}?next=${encodeURIComponent(location.href)}`;
        } else {
          this.setState({
            isLoading: false,
            errMessage: gettext('Error')
          });
        }
      } else {
        this.setState({
          isLoading: false,
          errMessage: gettext('Please check the network.')
        });
      }
    });
  }

  loadRepos = (groupID) => {
    this.setState({isLoading: true});
    seafileAPI.listGroupRepos(groupID).then((res) => {
      let repoList = res.data.map(item => {
        let repo = new Repo(item);
        return repo;
      });
      this.setState({
        isLoading: false,
        repoList: Utils.sortRepos(repoList, this.state.sortBy, this.state.sortOrder)
      });
    }).catch((error) => {
      if (error.response) {
        if (error.response.status == 403) {
          this.setState({
            isLoading: false,
            errMessage: gettext('Permission denied')
          });
          location.href = `${loginUrl}?next=${encodeURIComponent(location.href)}`;
        } else {
          this.setState({
            isLoading: false,
            errMessage: gettext('Error')
          });
        }
      } else {
        this.setState({
          isLoading: false,
          errMessage: gettext('Please check the network.')
        });
      }
    });
  }

  getEmptyTip = (currentGroup) => {
    let emptyTip = null;
    if (currentGroup) {
      if (currentGroup.parent_group_id === 0) {
        emptyTip = (
          <EmptyTip>
            <h2>{gettext('No library is shared to this group')}</h2>
            <p>{gettext('You can share libraries by clicking the "New Library" button above or the "Share" icon on your libraries list.')}</p>
            <p>{gettext('Libraries shared as writable can be downloaded and synced by other group members. Read only libraries can only be downloaded, updates by others will not be uploaded.')}</p>
          </EmptyTip>
        );
      } else {
        if (currentGroup.admins.indexOf(username) == -1) {  // is a member of this group
          emptyTip = (
            <EmptyTip>
              <h2>{gettext('No libraries')}</h2>
            </EmptyTip>
          );
        } else {
          emptyTip = (
            <EmptyTip>
              <h2>{gettext('No libraries')}</h2>
              <p>{gettext('You can create libraries by clicking the "New Library" button above.')}</p>
            </EmptyTip>
          );
        }
      }
    }
    return emptyTip;
  }

  onCreateRepoToggle = () => {
    this.setState({isCreateRepoDialogShow: !this.state.isCreateRepoDialogShow});
  }

  onCreateRepo = (repo, groupOwnerType) => {
    let groupId = this.props.groupID;
    if (groupOwnerType && groupOwnerType === 'department') {
      seafileAPI.createGroupOwnedLibrary(groupId, repo).then(res => { //need modify endpoint api
        let object = {
          repo_id: res.data.id,
          repo_name: res.data.name,
          owner_name: res.data.group_name,
          owner_email: res.data.owner,
          permission: res.data.permission,
          mtime: res.data.mtime,
          size: res.data.size,
          encrypted: res.data.encrypted,
        };
        let repo = new Repo(object);
        let repoList = this.addRepoItem(repo);
        this.setState({repoList: repoList});
      }).catch(error => {
        let errMessage = Utils.getErrorMsg(error);
        toaster.danger(errMessage);
      });

    } else {
      seafileAPI.createGroupRepo(groupId, repo).then(res => {
        let repo = new Repo(res.data);
        let repoList = this.addRepoItem(repo);
        this.setState({repoList: repoList});
      }).catch(error => {
        let errMessage = Utils.getErrorMsg(error);
        toaster.danger(errMessage);
      });
    }
    this.onCreateRepoToggle();
  }

  onItemDelete = (repo) => {
    let groupID = this.props.groupID;
    seafileAPI.deleteGroupOwnedLibrary(groupID, repo.repo_id).then(() => {
      let repoList = this.state.repoList.filter(item => {
        return item.repo_id !== repo.repo_id;
      });
      this.setState({repoList: repoList});
      this.loadGroup(groupID);
      let name = repo.repo_name;
      var msg = gettext('Successfully deleted {name}.').replace('{name}', name);
      toaster.success(msg);
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      if (errMessage === gettext('Error')) {
        let name = repo.repo_name;
        errMessage = gettext('Failed to delete {name}.').replace('{name}', name);
      }
      toaster.danger(errMessage);
    });
  }

  addRepoItem = (repo) => {
    let newRepoList = this.state.repoList.map(item => {return item;});
    newRepoList.unshift(repo);
    return newRepoList;
  }

  onItemUnshare = (repo) => {
    let group = this.state.currentGroup;
    seafileAPI.unshareRepoToGroup(repo.repo_id, group.id).then(() => {
      let repoList = this.state.repoList.filter(item => {
        return item.repo_id !== repo.repo_id;
      });
      this.setState({repoList: repoList});
      this.loadGroup(group.id);
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  onItemRename = (repo, newName) => {
    seafileAPI.renameGroupOwnedLibrary(this.props.groupID, repo.repo_id, newName).then(res => {
      let repoList = this.state.repoList.map(item => {
        if (item.repo_id === repo.repo_id) {
          item.repo_name = newName;
        }
        return item;
      });
      this.setState({repoList: repoList});
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  onTabNavClick = (tabName) => {
    this.props.onTabNavClick(tabName);
  }
  
  toggleGroupDropdown = () => {
    this.setState({
      showGroupDropdown: !this.state.showGroupDropdown
    });
  }

  toggleDismissGroupDialog = () => {
    this.setState({
      showDismissGroupDialog: !this.state.showDismissGroupDialog,
      showGroupDropdown: false,
    });
  }

  toggleRenameGroupDialog = () => {
    this.setState({
      showRenameGroupDialog: !this.state.showRenameGroupDialog,
      showGroupDropdown: false,
    });
  }

  toggleTransferGroupDialog = () => {
    this.setState({
      showTransferGroupDialog: !this.state.showTransferGroupDialog,
      showGroupDropdown: false,
    });
  }

  // toggleImportMembersDialog= () => {
  //   this.setState({
  //     showImportMembersDialog: !this.state.showImportMembersDialog
  //   });
  // }

  toggleManageMembersDialog = () => {
    this.setState({
      showManageMembersDialog: !this.state.showManageMembersDialog,
      showGroupDropdown: false,
    });
  }

  toggleLeaveGroupDialog = () => {
    this.setState({
      isLeaveGroupDialogOpen: !this.state.isLeaveGroupDialogOpen,
      showGroupDropdown: false,
    });
  }

  listGroupMembers = () => {
    seafileAPI.listGroupMembers(this.props.groupID).then((res) => {
      this.setState({
        groupMembers: res.data
      });
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  toggleGroupMembersPopover = (state) => {
    if (state === 'open') {
      this.listGroupMembers();
      this.setState({
        showGroupMembersPopover: true
      });
    } else {
      this.setState({
        showGroupMembersPopover: false
      });
    }
  }

  onItemDetails = (repo) => {
    this.setState({
      isShowDetails: true,
      currentRepo: repo,
    });
  }

  closeDetails = () => {
    this.setState({isShowDetails: false});
  }

  sortItems = (sortBy, sortOrder) => {
    cookie.save('seafile-repo-dir-sort-by', sortBy);
    cookie.save('seafile-repo-dir-sort-order', sortOrder);
    this.setState({
      sortBy: sortBy,
      sortOrder: sortOrder,
      repoList: Utils.sortRepos(this.state.repoList, sortBy, sortOrder)
    });
  }

  translateRole = (role) => {
    if (role === 'Admin') {
      return gettext('Admin');
    }  
    else if (role === 'Member') {
      return gettext('Member');
    }
    else if (role === 'Owner') {
      return gettext('Owner');
    }
  }

  toggleSortOptionsDialog = () => {
    this.setState({
      isSortOptionsDialogOpen: !this.state.isSortOptionsDialogOpen
    });
  }

  render() {
    let { errMessage, emptyTip, currentGroup, isDepartmentGroup, isStaff } = this.state;
    let isShowSettingIcon = false;
    if (currentGroup) { // group message is loaded  
      if (currentGroup.parent_group_id === 0) {
        isShowSettingIcon = true; 
      } else {
        if (currentGroup.admins.indexOf(username) > -1) {
          isShowSettingIcon = true; 
        }
      }
    }
    let useRate = 0;
    if (isDepartmentGroup && currentGroup.group_quota) {
      useRate = currentGroup.group_quota_usage / currentGroup.group_quota * 100 + '%';
    }
    return (
      <Fragment>
        <div className="main-panel-north border-left-show">
          <div className="cur-view-toolbar">
            <span className="sf2-icon-menu side-nav-toggle hidden-md-up d-md-none" title="Side Nav Menu" onClick={this.props.onShowSidePanel}></span>
            <div className="operation">
              {((!isDepartmentGroup && canAddRepo) || (isDepartmentGroup && isStaff)) && (
                Utils.isDesktop() ? (
                  <button className="btn btn-secondary operation-item" title={gettext('New Library')} onClick={this.onCreateRepoToggle}>
                    <i className="fas fa-plus-square text-secondary mr-1"></i>{gettext('New Library')}
                  </button>
                ) : (
                  <span className="sf2-icon-plus mobile-toolbar-icon" title={gettext('New Library')} onClick={this.onCreateRepoToggle}></span>
                )
              )}
            </div>
          </div>
          <CommonToolbar onSearchedClick={this.props.onSearchedClick} />
        </div>
        <div className="main-panel-center flex-row">
          <div className="cur-view-container">
            <div className="cur-view-path">
              {currentGroup && (
                <Fragment>
                  <div className="path-container">
                    <Link to={`${siteRoot}groups/`} onClick={() => this.onTabNavClick('groups')}>{gettext('Groups')}</Link>
                    <span className="path-split">/</span>
                    <span>{currentGroup.name}</span>
                    {isDepartmentGroup && (
                      <Fragment>
                        <span className="department-group-icon fas fa-building" title={gettext('This is a special group representing a department.')}></span>
                        {currentGroup.group_quota > 0 &&
                          <span className="department-usage-container">
                            <div className="department-usage">
                              <span id="quota-bar" className="department-quota-bar"><span id="quota-usage" className="usage" style={{width: useRate}}></span></span>
                              <span className="department-quota-info">{Utils.bytesToSize(currentGroup.group_quota_usage)} / {Utils.bytesToSize(currentGroup.group_quota)}</span>
                            </div>
                          </span>
                        }
                      </Fragment>
                    )}
                  </div>
                  <div className="path-tool">
                    { isShowSettingIcon &&
                    <React.Fragment>
                      <a href="#" className="sf2-icon-cog1 action-icon group-top-action-icon" title="Settings" id="settings"
                        onClick={this.toggleGroupDropdown}></a>
                      <Popover placement="bottom" isOpen={this.state.showGroupDropdown} target="settings"
                        toggle={this.toggleGroupDropdown} hideArrow={true} className="sf-popover">
                        <div className="sf-popover-hd sf-popover-title">
                          <span>{gettext('Settings')}</span>
                          <a href="#" className="sf-popover-close js-close sf2-icon-x1 action-icon"
                            onClick={this.toggleGroupDropdown}></a>
                        </div>
                        <div className="sf-popover-con">
                          {(this.state.isStaff || this.state.isOwner) &&
                          <ul className="sf-popover-list">
                            <li><a href="#" className="sf-popover-item" onClick={this.toggleRenameGroupDialog} >{gettext('Rename')}</a></li>
                            {
                              this.state.isOwner &&
                              <li><a href="#" className="sf-popover-item" onClick={this.toggleTransferGroupDialog} >{gettext('Transfer')}</a></li>
                            }
                          </ul>
                          }
                          {(this.state.isStaff || this.state.isOwner) &&
                          <ul className="sf-popover-list">
                            {/* <li><a href="#" className="sf-popover-item" onClick={this.toggleImportMembersDialog} >{gettext('Import Members')}</a></li> */}
                            <li><a href="#" className="sf-popover-item" onClick={this.toggleManageMembersDialog} >{gettext('Manage Members')}</a></li>
                          </ul>
                          }
                          {
                            this.state.isOwner &&
                            <ul className="sf-popover-list">
                              <li><a href="#" className="sf-popover-item" onClick={this.toggleDismissGroupDialog}>{gettext('Delete Group')}</a></li>
                            </ul>
                          }
                          {/* gourp owner only can dissmiss group, admin could not quit, department member could not quit */}
                          {(!this.state.isOwner && !this.state.isStaff && !isDepartmentGroup) &&
                          <ul className="sf-popover-list">
                            <li><a href="#" className="sf-popover-item" onClick={this.toggleLeaveGroupDialog}>{gettext('Leave Group')}</a></li>
                          </ul>
                          }
                        </div>
                      </Popover>
                    </React.Fragment>
                    }
                    <a href="#"
                      className="sf2-icon-user2 action-icon group-top-action-icon"
                      title={gettext('Members')} id="groupMembers"
                      onClick={() => this.toggleGroupMembersPopover('open')}>
                    </a>
                    <Popover placement="bottom" isOpen={this.state.showGroupMembersPopover} target="groupMembers"
                      toggle={this.toggleGroupMembersPopover} hideArrow={true} className="sf-popover">
                      <div className="sf-popover-hd sf-popover-title group-member-list-header">
                        <span>{gettext('Members')}</span>
                        <a href="#" className="sf-popover-close js-close sf2-icon-x1 action-icon"
                          onClick={this.toggleGroupMembersPopover}></a>
                      </div>
                      <div className="sf-popover-con">
                        <ul className="sf-popover-list group-member-list">
                          {this.state.groupMembers.map((item, index) => {
                            return (
                              <li key={index}>
                                <a href="#" className="sf-popover-item user-item d-flex">
                                  <img src={item.avatar_url} alt="" className="group-member-avatar avatar"/>
                                  <span className="txt-item ellipsis d-flex">
                                    <span className="group-member-name ellipsis">{item.name}</span>
                                    <span className="group-member-admin">{this.translateRole(item.role)}</span>
                                  </span>
                                </a>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    </Popover>
                    {(!Utils.isDesktop() && this.state.repoList.length > 0) && <span className="sf3-font sf3-font-sort action-icon" onClick={this.toggleSortOptionsDialog}></span>}
                    {this.state.isSortOptionsDialogOpen &&
                    <SortOptionsDialog
                      toggleDialog={this.toggleSortOptionsDialog}
                      sortBy={this.state.sortBy}
                      sortOrder={this.state.sortOrder}
                      sortItems={this.sortItems}
                    />
                    }
                  </div>
                </Fragment>
              )}
            </div>
            <div className="cur-view-content">
              {this.state.isLoading && <Loading />}
              {(!this.state.isLoading && errMessage) && errMessage}
              {(!this.state.isLoading && this.state.repoList.length === 0) && emptyTip}
              {(!this.state.isLoading && this.state.repoList.length > 0) &&
                <SharedRepoListView 
                  repoList={this.state.repoList} 
                  currentGroup={this.state.currentGroup} 
                  sortBy={this.state.sortBy}
                  sortOrder={this.state.sortOrder}
                  sortItems={this.sortItems}
                  onItemUnshare={this.onItemUnshare}
                  onItemDelete={this.onItemDelete}
                  onItemDetails={this.onItemDetails}
                  onItemRename={this.onItemRename}
                />
              }
            </div>
          </div>
          {this.state.isShowDetails && (
            <div className="cur-view-detail">
              <LibDetail currentRepo={this.state.currentRepo} closeDetails={this.closeDetails}/>
            </div>
          )}
        </div>
        {this.state.isCreateRepoDialogShow && !this.state.isDepartmentGroup && (
          <ModalPortal>
            <CreateRepoDialog 
              libraryType={this.state.libraryType}
              onCreateToggle={this.onCreateRepoToggle}
              onCreateRepo={this.onCreateRepo}
            />
          </ModalPortal>
        )}
        {this.state.isCreateRepoDialogShow && this.state.isDepartmentGroup &&
          <CreateRepoDialog 
            isAdmin={this.state.isAdmin}
            onCreateToggle={this.onCreateRepoToggle}
            onCreateRepo={this.onCreateRepo}
            libraryType='department'
          />
        }
        {this.state.showRenameGroupDialog &&
          <RenameGroupDialog
            showRenameGroupDialog={this.state.showRenameGroupDialog}
            toggleRenameGroupDialog={this.toggleRenameGroupDialog}
            loadGroup={this.loadGroup}
            groupID={this.props.groupID}
            onGroupChanged={this.props.onGroupChanged}
            currentGroupName={currentGroup.name}
          />
        }
        {this.state.showDismissGroupDialog &&
          <DismissGroupDialog
            showDismissGroupDialog={this.state.showDismissGroupDialog}
            toggleDismissGroupDialog={this.toggleDismissGroupDialog}
            loadGroup={this.loadGroup}
            groupID={this.props.groupID}
            onGroupChanged={this.props.onGroupChanged}
          />
        }
        {this.state.showTransferGroupDialog &&
          <TransferGroupDialog
            toggleTransferGroupDialog={this.toggleTransferGroupDialog}
            groupID={this.props.groupID}
            onGroupChanged={this.props.onGroupChanged}
          />
        }
        {/* this.state.showImportMembersDialog &&
          <ImportMembersDialog
            toggleImportMembersDialog={this.toggleImportMembersDialog}
            groupID={this.props.groupID}
            onGroupChanged={this.props.onGroupChanged}
          />
        */}
        {this.state.showManageMembersDialog &&
          <ManageMembersDialog
            toggleManageMembersDialog={this.toggleManageMembersDialog}
            groupID={this.props.groupID}
            onGroupChanged={this.props.onGroupChanged}
            isOwner={this.state.isOwner}
          />
        }
        {this.state.isLeaveGroupDialogOpen &&
          <LeaveGroupDialog
            toggleLeaveGroupDialog={this.toggleLeaveGroupDialog}
            groupID={this.props.groupID}
            onGroupChanged={this.props.onGroupChanged}
          />
        }
      </Fragment>
    );
  }
}

GroupView.propTypes = propTypes;

export default GroupView;
