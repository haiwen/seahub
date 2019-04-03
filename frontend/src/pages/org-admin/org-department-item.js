import React from 'react';
import PropTypes from 'prop-types';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils.js';
import { serviceURL, mediaUrl, gettext, orgID } from '../../utils/constants';
import OrgDepartmentsList from './org-departments-list';
import ModalPortal from '../../components/modal-portal';
import AddMemberDialog from '../../components/dialog/org-add-member-dialog';
import DeleteMemberDialog from '../../components/dialog/org-delete-member-dialog';
import AddRepoDialog from '../../components/dialog/org-add-repo-dialog';
import DeleteRepoDialog from '../../components/dialog/org-delete-repo-dialog';
import RoleEditor from '../../components/select-editor/role-editor';
import '../../css/org-department-item.css';

class OrgDepartmentItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      members: [],
      repos: [],
      groups: [],
      ancestorGroups: [],
      deletedMember: {},
      deletedRepo: {},
      showAddMemberDialog: false,
      showDeleteMemberDialog: false,
      showAddRepoDialog: false,
      showDeleteRepoDialog: false,
      isItemFreezed: false,
      groupID: null,
      groupName: '',
    }
  }

  listOrgGroupRepo = (groupID) => {
    seafileAPI.orgAdminListDepartGroupRepos(orgID, groupID).then(res => {
      this.setState({
        repos: res.data.libraries
      });
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
    });
  }

  showAddMemberDialog = () => {
    this.setState({ showAddMemberDialog: true });
  }

  showDeleteMemberDialog = (member) => {
    this.setState({ showDeleteMemberDialog: true, deletedMember: member });
  }

  showAddRepoDialog = () => {
    this.setState({ showAddRepoDialog: true });
  }

  showDeleteRepoDialog = (repo) => {
    this.setState({ showDeleteRepoDialog: true, deletedRepo: repo });
  }

  toggleCancel = () => {
    this.setState({
      showAddMemberDialog: false,
      showDeleteMemberDialog: false,
      showAddRepoDialog: false,
      showDeleteRepoDialog: false,
    });
  }

  onRepoChanged = () => {
    this.listOrgGroupRepo(this.state.groupID);
  }

  onMemberChanged = () => {
    this.listOrgMembers(this.state.groupID);
  }

  toggleItemFreezed = (isFreezed) => {
    this.setState({
      isItemFreezed: isFreezed
    });
  }

  componentWillMount() {
    const href = window.location.href;
    let path = href.slice(href.indexOf('groups/'));
    let groupID = path.slice(7, path.length - 1);
    this.setState({
      groupID: groupID
    });
    this.listOrgGroupRepo(groupID);
    this.listOrgMembers(groupID);
  }

  render() {
    const members = this.state.members;
    const repos = this.state.repos;
    return (
      <div className="main-panel-center flex-row h-100">
        <div className="cur-view-container o-auto">
          <div className="cur-view-path">
            <h3 className="sf-heading">
              { this.state.groupID ? 
                <a href={serviceURL + '/org/departmentadmin/'}>{gettext('Departments')}</a>
                : <span>{gettext('Departments')}</span>
              }
              {
                this.state.ancestorGroups.map(ancestor => {
                  let newHref = serviceURL + '/org/departmentadmin/groups/' + ancestor.id + '/';
                  return (
                    <span key={ancestor.id}>{' / '}<a href={newHref}>{ancestor.name}</a></span>
                  );
                })
              }
              { this.state.groupID && <span>{' / '}{this.state.groupName}</span> }
            </h3>
          </div>

          <div className="cur-view-subcontainer org-groups">
            <OrgDepartmentsList groupID={this.state.groupID} />
          </div>
          
          <div className="cur-view-subcontainer org-members">
            <div className="cur-view-path">
              <div className="fleft">
                <h3 className="sf-heading">{gettext('Members')}</h3>
              </div>
              <div className="fright">
                <button className="btn-white operation-item" onClick={this.showAddMemberDialog}>{gettext('Add Member')}</button>
              </div>
            </div>
            <div className="cur-view-content">
              {(members && members.length === 1 && members[0].role === "Owner") ?
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
                            showAddMemberDialog={this.showAddMemberDialog}
                            showDeleteMemberDialog={this.showDeleteMemberDialog}
                            isItemFreezed={this.state.isItemFreezed}
                            onMemberChanged={this.onMemberChanged}
                            toggleItemFreezed={this.toggleItemFreezed}
                            groupID={this.state.groupID}
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
              <div className="fright">
                <button className="btn-white operation-item" onClick={this.showAddRepoDialog}>{gettext('New Library')}</button>
              </div>
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
                groupID={this.state.groupID}
              />
            </ModalPortal>
          )}
          {this.state.showDeleteRepoDialog && (
            <ModalPortal>
              <DeleteRepoDialog
                toggle={this.toggleCancel}
                onRepoChanged={this.onRepoChanged}
                repo={this.state.deletedRepo}
                groupID={this.state.groupID}
              />
            </ModalPortal>
          )}
          {this.state.showAddMemberDialog && (
            <ModalPortal>
              <AddMemberDialog
                toggle={this.toggleCancel}
                onMemberChanged={this.onMemberChanged}
                groupID={this.state.groupID}
              />
            </ModalPortal>
          )}
          {this.state.showAddRepoDialog && (
            <ModalPortal>
              <AddRepoDialog
                toggle={this.toggleCancel}
                onRepoChanged={this.onRepoChanged}
                groupID={this.state.groupID}
              />
            </ModalPortal>
          )}
        </React.Fragment>
      </div>
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
    seafileAPI.orgAdminSetDepartGroupUserRole(orgID, this.props.groupID, this.props.member.email, isAdmin).then((res) => {
      this.props.onMemberChanged();
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
        <td><img src={member.avatar_url} alt="member-header" width="24"/></td>
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
        {
          !this.props.isItemFreezed ?
            <td className="cursor-pointer text-center" onClick={this.props.showDeleteMemberDialog.bind(this, member)}>
              <span className={`sf2-icon-delete action-icon ${highlight ? '' : 'vh'}`} title="Delete"></span>
            </td> : <td></td>
        }        
      </tr>
    );
  }
}

const MemberItemPropTypes = {
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

export default OrgDepartmentItem;