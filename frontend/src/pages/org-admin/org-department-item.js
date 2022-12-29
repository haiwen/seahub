import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import { Link } from '@gatsbyjs/reach-router';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils.js';
import toaster from '../../components/toast';
import MainPanelTopbar from './main-panel-topbar';
import ModalPortal from '../../components/modal-portal';
import RoleEditor from '../../components/select-editor/role-editor';
import AddDepartDialog from '../../components/dialog/org-add-department-dialog';
import AddMemberDialog from '../../components/dialog/org-add-member-dialog';
import DeleteMemberDialog from '../../components/dialog/org-delete-member-dialog';
import AddRepoDialog from '../../components/dialog/org-add-repo-dialog';
import DeleteRepoDialog from '../../components/dialog/org-delete-repo-dialog';
import DeleteDepartDialog from '../../components/dialog/org-delete-department-dialog';
import SetGroupQuotaDialog from '../../components/dialog/org-set-group-quota-dialog';
import RenameDepartmentDialog from '../../components/dialog/org-rename-department-dialog';
import OpMenu from '../../components/dialog/op-menu';
import { serviceURL, siteRoot, gettext, orgID, lang } from '../../utils/constants';
import '../../css/org-department-item.css';

moment.locale(lang);

class OrgDepartmentItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      groupName: '',
      isItemFreezed: false,
      isDepartFreezed: false,
      ancestorGroups: [],
      members: [],
      deletedMember: {},
      isShowAddMemberDialog: false,
      showDeleteMemberDialog: false,
      repos: [],
      deletedRepo: {},
      isShowAddRepoDialog: false,
      showDeleteRepoDialog: false,
      groups: [],
      subGroupID: '',
      subGroupName: '',
      isShowAddDepartDialog: false,
      showDeleteDepartDialog: false,
      showSetGroupQuotaDialog: false,
    };
  }

  componentDidMount() {
    const groupID = this.props.groupID;
    this.listOrgGroupRepo(groupID);
    this.listOrgMembers(groupID);
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.groupID !== nextProps.groupID) {
      this.listOrgGroupRepo(nextProps.groupID);
      this.listOrgMembers(nextProps.groupID);
    }
  }

  listOrgGroupRepo = (groupID) => {
    seafileAPI.orgAdminListGroupRepos(orgID, groupID).then(res => {
      this.setState({ repos: res.data.libraries });
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  listOrgMembers = (groupID) => {
    seafileAPI.orgAdminListGroupInfo(orgID, groupID, true).then(res => {
      this.setState({
        members: res.data.members,
        groups: res.data.groups,
        ancestorGroups: res.data.ancestor_groups,
        groupName: res.data.name,
      });
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  listSubDepartGroups = (groupID) => {
    seafileAPI.orgAdminListGroupInfo(orgID, groupID, true).then(res => {
      this.setState({ groups: res.data.groups });
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  toggleCancel = () => {
    this.setState({
      showDeleteMemberDialog: false,
      showDeleteRepoDialog: false,
      showDeleteDepartDialog: false,
      showSetGroupQuotaDialog: false,
    });
  }

  onFreezedDepart = () => {
    this.setState({isDepartFreezed: true});
  }

  onUnfreezedDepart = () => {
    this.setState({isDepartFreezed: false});
  }

  onDepartmentNameChanged = (dept) => {
    this.setState({
      groups: this.state.groups.map(item => {
        if (item.id == dept.id) {
          item.name = dept.name;
        }
        return item;
      })
    });
  }

  onSubDepartChanged = () => {
    this.listSubDepartGroups(this.props.groupID);
  }

  onRepoChanged = () => {
    this.listOrgGroupRepo(this.props.groupID);
  }

  onMemberChanged = () => {
    this.listOrgMembers(this.props.groupID);
  }

  toggleItemFreezed = (isFreezed) => {
    this.setState({ isItemFreezed: isFreezed });
  }

  showDeleteMemberDialog = (member) => {
    this.setState({ showDeleteMemberDialog: true, deletedMember: member });
  }

  showDeleteRepoDialog = (repo) => {
    this.setState({ showDeleteRepoDialog: true, deletedRepo: repo });
  }

  toggleAddRepoDialog = () => {
    this.setState({ isShowAddRepoDialog: !this.state.isShowAddRepoDialog });
  }

  toggleAddMemberDialog = () => {
    this.setState({ isShowAddMemberDialog: !this.state.isShowAddMemberDialog });
  }

  toggleAddDepartDialog = () => {
    this.setState({ isShowAddDepartDialog: !this.state.isShowAddDepartDialog});
  }

  showDeleteDepartDialog = (subGroup) => {
    this.setState({
      showDeleteDepartDialog: true,
      subGroupID: subGroup.id,
      subGroupName: subGroup.name
    });
  }

  showSetGroupQuotaDialog = (subGroupID) => {
    this.setState({
      showSetGroupQuotaDialog: true,
      subGroupID: subGroupID
    });
  }

  render() {
    const { members, repos, groups } = this.state;
    const groupID = this.props.groupID;
    const topBtn = 'btn btn-secondary operation-item';
    const topbarChildren = (
      <Fragment>
        {groupID &&
          <button className={topBtn} title={gettext('New Sub-department')} onClick={this.toggleAddDepartDialog}>{gettext('New Sub-department')}</button>
        }
        {groupID &&
          <button className={topBtn} title={gettext('Add Member')} onClick={this.toggleAddMemberDialog}>{gettext('Add Member')}</button>
        }
        {groupID &&
          <button className={topBtn} onClick={this.toggleAddRepoDialog} title={gettext('New Library')}>{gettext('New Library')}</button>
        }
        {this.state.isShowAddMemberDialog && (
          <ModalPortal>
            <AddMemberDialog
              toggle={this.toggleAddMemberDialog}
              onMemberChanged={this.onMemberChanged}
              groupID={groupID}
            />
          </ModalPortal>
        )}
        {this.state.isShowAddRepoDialog && (
          <ModalPortal>
            <AddRepoDialog
              toggle={this.toggleAddRepoDialog}
              onRepoChanged={this.onRepoChanged}
              groupID={groupID}
            />
          </ModalPortal>
        )}
        {this.state.isShowAddDepartDialog && (
          <ModalPortal>
            <AddDepartDialog
              onDepartChanged={this.onSubDepartChanged}
              parentGroupID={groupID}
              toggle={this.toggleAddDepartDialog}
            />
          </ModalPortal>
        )}
      </Fragment>
    );

    return (
      <Fragment>
        <MainPanelTopbar children={topbarChildren} />
        <div className="main-panel-center flex-row h-100">
          <div className="cur-view-container o-auto">
            <div className="cur-view-path">
              <div className="fleft">
                <h3 className="sf-heading">
                  {groupID ?
                    <Link to={siteRoot + 'org/departmentadmin/'}>{gettext('Departments')}</Link>
                    : <span>{gettext('Departments')}</span>
                  }
                  {this.state.ancestorGroups.map(ancestor => {
                    let newHref = siteRoot + 'org/departmentadmin/groups/' + ancestor.id + '/';
                    return <span key={ancestor.id}>{' / '}<Link to={newHref}>{ancestor.name}</Link></span>;
                  })}
                  {groupID && <span>{' / '}{this.state.groupName}</span>}
                </h3>
              </div>
            </div>

            <div className="cur-view-subcontainer org-groups">
              <div className="cur-view-path">
                <div className="fleft"><h3 className="sf-heading">{gettext('Sub-departments')}</h3></div>
              </div>
              <div className="cur-view-content">
                {groups && groups.length > 0 ?
                  <table>
                    <thead>
                      <tr>
                        <th width="40%">{gettext('Name')}</th>
                        <th width="25%">{gettext('Created At')}</th>
                        <th width="20%">{gettext('Quota')}</th>
                        <th width="15%"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {groups.map((group, index) => {
                        return(
                          <React.Fragment key={group.id}>
                            <GroupItem
                              group={group}
                              isItemFreezed={this.state.isDepartFreezed}
                              onFreezedItem={this.onFreezedDepart}
                              onUnfreezedItem={this.onUnfreezedDepart}
                              onDepartmentNameChanged={this.onDepartmentNameChanged}
                              showDeleteDepartDialog={this.showDeleteDepartDialog}
                              showSetGroupQuotaDialog={this.showSetGroupQuotaDialog}
                            />
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                  : <p className="no-group">{gettext('No sub-departments')}</p>
                }
              </div>
            </div>

            <div className="cur-view-subcontainer org-members">
              <div className="cur-view-path">
                <div className="fleft"><h3 className="sf-heading">{gettext('Members')}</h3></div>
              </div>
              <div className="cur-view-content">
                {(!members || members.length === 0) ?
                  <p className="no-member">{gettext('No members')}</p> :
                  <table>
                    <thead>
                      <tr>
                        <th width="5%"></th>
                        <th width="50%">{gettext('Name')}</th>
                        <th width="15%">{gettext('Role')}</th>
                        <th width="30%"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {members.map((member, index) => {
                        return (
                          <React.Fragment key={index}>
                            <MemberItem
                              member={member}
                              showDeleteMemberDialog={this.showDeleteMemberDialog}
                              isItemFreezed={this.state.isItemFreezed}
                              onMemberChanged={this.onMemberChanged}
                              toggleItemFreezed={this.toggleItemFreezed}
                              groupID={groupID}
                            />
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                }
              </div>
            </div>

            <div className="cur-view-subcontainer org-libriries">
              <div className="cur-view-path">
                <div className="fleft"><h3 className="sf-heading">{gettext('Libraries')}</h3></div>
              </div>
              { repos.length > 0 ?
                <div className="cur-view-content">
                  <table>
                    <thead>
                      <tr>
                        <th width="5%"></th>
                        <th width="50%">{gettext('Name')}</th>
                        <th width="30%">{gettext('Size')}</th>
                        <th width="15%"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {repos.map((repo, index) => {
                        return(
                          <React.Fragment key={index}>
                            <RepoItem repo={repo} showDeleteRepoDialog={this.showDeleteRepoDialog}/>
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                : <p className="no-libraty">{gettext('No libraries')}</p>
              }
            </div>

          </div>
          <React.Fragment>
            {this.state.showDeleteMemberDialog && (
              <ModalPortal>
                <DeleteMemberDialog
                  toggle={this.toggleCancel}
                  onMemberChanged={this.onMemberChanged}
                  member={this.state.deletedMember}
                  groupID={groupID}
                />
              </ModalPortal>
            )}
            {this.state.showDeleteRepoDialog && (
              <ModalPortal>
                <DeleteRepoDialog
                  toggle={this.toggleCancel}
                  onRepoChanged={this.onRepoChanged}
                  repo={this.state.deletedRepo}
                  groupID={groupID}
                />
              </ModalPortal>
            )}
            {this.state.showDeleteDepartDialog && (
              <ModalPortal>
                <DeleteDepartDialog
                  toggle={this.toggleCancel}
                  groupID={this.state.subGroupID}
                  groupName={this.state.subGroupName}
                  onDepartChanged={this.onSubDepartChanged}
                />
              </ModalPortal>
            )}
            {this.state.showSetGroupQuotaDialog && (
              <ModalPortal>
                <SetGroupQuotaDialog
                  toggle={this.toggleCancel}
                  groupID={this.state.subGroupID}
                  onDepartChanged={this.onSubDepartChanged}
                />
              </ModalPortal>
            )}
          </React.Fragment>
        </div>
      </Fragment>
    );
  }
}

class MemberItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      highlight: false,
      showRoleMenu: false,
    };
    this.roles = ['Admin', 'Member'];
  }

  onMouseEnter = () => {
    if (this.props.isItemFreezed) return;
    this.setState({ highlight: true });
  }

  onMouseLeave = () => {
    if (this.props.isItemFreezed) return;
    this.setState({ highlight: false });
  }

  toggleMemberRoleMenu = () => {
    this.setState({ showRoleMenu: !this.state.showRoleMenu });
  }

  onChangeUserRole = (role) => {
    let isAdmin = role === 'Admin' ? true : false;
    seafileAPI.orgAdminSetGroupMemberRole(orgID, this.props.groupID, this.props.member.email, isAdmin).then((res) => {
      this.props.onMemberChanged();
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
    this.setState({
      highlight: false,
    });
  }

  render() {
    const member = this.props.member;
    const highlight = this.state.highlight;
    let memberLink = serviceURL + '/org/useradmin/info/' + member.email + '/';
    if (member.role === 'Owner') return null;
    return (
      <tr className={highlight ? 'tr-highlight' : ''} onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave}>
        <td><img src={member.avatar_url} alt="member-header" width="24" className="avatar"/></td>
        <td><a href={memberLink}>{member.name}</a></td>
        <td>
          <RoleEditor
            isTextMode={true}
            isEditIconShow={highlight}
            currentRole={member.role}
            roles={this.roles}
            onRoleChanged={this.onChangeUserRole}
            toggleItemFreezed={this.props.toggleItemFreezed}
          />
        </td>
        {!this.props.isItemFreezed ?
          <td className="cursor-pointer text-center" onClick={this.props.showDeleteMemberDialog.bind(this, member)}>
            <span className={`sf2-icon-x3 action-icon ${highlight ? '' : 'vh'}`} title="Delete"></span>
          </td> : <td></td>
        }
      </tr>
    );
  }
}

const MemberItemPropTypes = {
  groupID: PropTypes.string.isRequired,
  member: PropTypes.object.isRequired,
  isItemFreezed: PropTypes.bool.isRequired,
  onMemberChanged: PropTypes.func.isRequired,
  showDeleteMemberDialog: PropTypes.func.isRequired,
  toggleItemFreezed: PropTypes.func.isRequired,
};

MemberItem.propTypes = MemberItemPropTypes;

class RepoItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      highlight: false,
    };
  }

  onMouseEnter = () => {
    this.setState({ highlight: true });
  }

  onMouseLeave = () => {
    this.setState({ highlight: false });
  }

  render() {
    const repo = this.props.repo;
    const highlight = this.state.highlight;
    let iconUrl = Utils.getLibIconUrl(repo);
    return (
      <tr className={highlight ? 'tr-highlight' : ''} onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave}>
        <td><img src={iconUrl} width="24" alt={gettext('icon')}/></td>
        <td>{repo.name}</td>
        <td>{Utils.bytesToSize(repo.size)}{' '}</td>
        <td className="cursor-pointer text-center" onClick={this.props.showDeleteRepoDialog.bind(this, repo)}>
          <span className={`sf2-icon-delete action-icon ${highlight ? '' : 'vh'}`} title="Delete"></span>
        </td>
      </tr>
    );
  }
}

const RepoItemPropTypes = {
  repo: PropTypes.object.isRequired,
  showDeleteRepoDialog: PropTypes.func.isRequired,
};

RepoItem.propTypes = RepoItemPropTypes;

class GroupItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      highlight: false,
      isOpIconShown: false,
      isRenameDialogOpen: false,
    };
  }

  onMouseEnter = () => {
    if (!this.props.isItemFreezed) {
      this.setState({
        isOpIconShown: true,
        highlight: true
      });
    }
  }

  onMouseLeave = () => {
    if (!this.props.isItemFreezed) {
      this.setState({
        isOpIconShown: false,
        highlight: false
      });
    }
  }

  translateOperations = (item) => {
    let translateResult = '';
    switch(item) {
      case 'Rename':
        translateResult = gettext('Rename');
        break;
      case 'Delete':
        translateResult = gettext('Delete');
        break;
      default:
        break;
    }

    return translateResult;
  }

  onMenuItemClick = (operation) => {
    const { group } = this.props;
    switch(operation) {
      case 'Rename':
        this.toggleRenameDialog();
        break;
      case 'Delete':
        this.props.showDeleteDepartDialog(group);
        break;
      default:
        break;
    }
  }

  onUnfreezedItem = () => {
    this.setState({
      highlight: false,
      isOpIconShow: false
    });
    this.props.onUnfreezedItem();
  }

  toggleRenameDialog = () => {
    this.setState({
      isRenameDialogOpen: !this.state.isRenameDialogOpen
    });
  }

  render() {
    const group = this.props.group;
    const { highlight, isOpIconShown, isRenameDialogOpen } = this.state;
    const newHref = siteRoot+ 'org/departmentadmin/groups/' + group.id + '/';
    return (
      <Fragment>
        <tr className={highlight ? 'tr-highlight' : ''} onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave}>
          <td><Link to={newHref}>{group.name}</Link></td>
          <td>{moment(group.created_at).fromNow()}</td>
          <td onClick={this.props.showSetGroupQuotaDialog.bind(this, group.id)}>
            {Utils.bytesToSize(group.quota)}{' '}
            <span title="Edit Quota" className={`fa fa-pencil-alt attr-action-icon ${highlight ? '' : 'vh'}`}></span>
          </td>
          <td>
            {isOpIconShown &&
              <OpMenu
                operations={['Rename', 'Delete']}
                translateOperations={this.translateOperations}
                onMenuItemClick={this.onMenuItemClick}
                onFreezedItem={this.props.onFreezedItem}
                onUnfreezedItem={this.onUnfreezedItem}
              />
            }
          </td>
        </tr>
        {isRenameDialogOpen && (
          <RenameDepartmentDialog
            orgID={orgID}
            groupID={group.id}
            name={group.name}
            toggle={this.toggleRenameDialog}
            onDepartmentNameChanged={this.props.onDepartmentNameChanged}
          />
        )}
      </Fragment>
    );
  }
}

const GroupItemPropTypes = {
  group: PropTypes.object.isRequired,
  groupID: PropTypes.string,
  isItemFreezed: PropTypes.bool.isRequired,
  onFreezedItem: PropTypes.func.isRequired,
  onUnfreezedItem: PropTypes.func.isRequired,
  onDepartmentNameChanged: PropTypes.func.isRequired,
  showSetGroupQuotaDialog: PropTypes.func.isRequired,
  showDeleteDepartDialog: PropTypes.func.isRequired,
  isSubdepartChanged: PropTypes.bool,
};

GroupItem.propTypes = GroupItemPropTypes;


const OrgDepartmentItemPropTypes = {
  groupID: PropTypes.string,
};

OrgDepartmentItem.propTypes = OrgDepartmentItemPropTypes;

export default OrgDepartmentItem;
