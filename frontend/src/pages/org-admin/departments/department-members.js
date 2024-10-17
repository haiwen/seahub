import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import { seafileAPI } from '../../../utils/seafile-api';
import { Utils } from '../../../utils/utils';
import toaster from '../../../components/toast';
import ModalPortal from '../../../components/modal-portal';
import RoleSelector from '../../../components/single-selector';
import DeleteMemberDialog from '../../../components/dialog/org-delete-member-dialog';
import { serviceURL, gettext, orgID, lang } from '../../../utils/constants';
import Department from './department';
import EmptyTip from '../../../components/empty-tip';
import '../../../css/org-department-item.css';

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
      groups: [],
      subGroupID: '',
      subGroupName: '',
      isShowAddDepartDialog: false,
      showSetGroupQuotaDialog: false,
    };
  }

  componentDidMount() {
    const groupID = this.props.groupID;
    this.listOrgGroupRepo(groupID);
    this.listOrgMembers(groupID);
  }

  UNSAFE_componentWillReceiveProps(nextProps) {
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
  };

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
  };

  listSubDepartGroups = (groupID) => {
    seafileAPI.orgAdminListGroupInfo(orgID, groupID, true).then(res => {
      this.setState({ groups: res.data.groups });
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  toggleCancel = () => {
    this.setState({
      showDeleteMemberDialog: false,
      showDeleteRepoDialog: false,
      showDeleteDepartDialog: false,
      showSetGroupQuotaDialog: false,
    });
  };

  onFreezedDepart = () => {
    this.setState({ isDepartFreezed: true });
  };

  onUnfreezedDepart = () => {
    this.setState({ isDepartFreezed: false });
  };

  onDepartmentNameChanged = (dept) => {
    this.setState({
      groups: this.state.groups.map(item => {
        if (item.id == dept.id) {
          item.name = dept.name;
        }
        return item;
      })
    });
  };

  onSubDepartChanged = () => {
    this.listSubDepartGroups(this.props.groupID);
  };

  onRepoChanged = () => {
    this.listOrgGroupRepo(this.props.groupID);
  };

  onMemberChanged = () => {
    this.listOrgMembers(this.props.groupID);
  };

  toggleItemFreezed = (isFreezed) => {
    this.setState({ isItemFreezed: isFreezed });
  };

  showDeleteMemberDialog = (member) => {
    this.setState({ showDeleteMemberDialog: true, deletedMember: member });
  };


  toggleAddRepoDialog = () => {
    this.setState({ isShowAddRepoDialog: !this.state.isShowAddRepoDialog });
  };

  toggleAddMemberDialog = () => {
    this.setState({ isShowAddMemberDialog: !this.state.isShowAddMemberDialog });
  };

  toggleAddDepartDialog = () => {
    this.setState({ isShowAddDepartDialog: !this.state.isShowAddDepartDialog });
  };

  showSetGroupQuotaDialog = (subGroupID) => {
    this.setState({
      showSetGroupQuotaDialog: true,
      subGroupID: subGroupID
    });
  };

  onAddNewMembers = (newMembers) => {
    const { members } = this.state;
    members.unshift(...newMembers);
    this.setState({ members });
  };

  render() {
    const { members } = this.state;
    const { groupID } = this.props;

    return (
      <Fragment>
        <Department
          groupID={groupID}
          currentItem="members"
          onAddNewMembers={this.onAddNewMembers}
        >
          <div className="cur-view-content">
            {(!members || members.length === 0) ?
              <EmptyTip text={gettext('No members')}/> :
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
                      <MemberItem
                        key={index}
                        member={member}
                        showDeleteMemberDialog={this.showDeleteMemberDialog}
                        isItemFreezed={this.state.isItemFreezed}
                        onMemberChanged={this.onMemberChanged}
                        toggleItemFreezed={this.toggleItemFreezed}
                        groupID={groupID}
                      />
                    );
                  })}
                </tbody>
              </table>
            }
          </div>
        </Department>

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
      </Fragment>
    );
  }
}

class MemberItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      highlight: false
    };
    this.roleOptions = [
      { value: 'Admin', text: gettext('Admin'), isSelected: false },
      { value: 'Member', text: gettext('Member'), isSelected: false }
    ];
  }

  onMouseEnter = () => {
    if (this.props.isItemFreezed) return;
    this.setState({ highlight: true });
  };

  onMouseLeave = () => {
    if (this.props.isItemFreezed) return;
    this.setState({ highlight: false });
  };

  onChangeUserRole = (roleOption) => {
    let isAdmin = roleOption.value === 'Admin' ? true : false;
    seafileAPI.orgAdminSetGroupMemberRole(orgID, this.props.groupID, this.props.member.email, isAdmin).then((res) => {
      this.props.onMemberChanged();
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
    this.setState({
      highlight: false,
    });
  };

  render() {
    const member = this.props.member;
    const highlight = this.state.highlight;
    let memberLink = serviceURL + '/org/useradmin/info/' + member.email + '/';
    if (member.role === 'Owner') return null;

    this.roleOptions = this.roleOptions.map(item => {
      item.isSelected = item.value == member.role;
      return item;
    });
    const currentSelectedOption = this.roleOptions.filter(item => item.isSelected)[0];

    return (
      <tr className={highlight ? 'tr-highlight' : ''} onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave}>
        <td><img src={member.avatar_url} alt="member-header" width="24" className="avatar"/></td>
        <td><a href={memberLink}>{member.name}</a></td>
        <td>
          <RoleSelector
            isDropdownToggleShown={highlight}
            currentSelectedOption={currentSelectedOption}
            options={this.roleOptions}
            selectOption={this.onChangeUserRole}
            toggleItemFreezed={this.props.toggleItemFreezed}
          />
        </td>
        <td className="cursor-pointer text-center" onClick={this.props.showDeleteMemberDialog.bind(this, member)}>
          <span className={`sf2-icon-x3 action-icon ${highlight ? '' : 'vh'}`} title="Delete"></span>
        </td>
      </tr>
    );
  }
}

const MemberItemPropTypes = {
  groupID: PropTypes.string,
  member: PropTypes.object.isRequired,
  isItemFreezed: PropTypes.bool.isRequired,
  onMemberChanged: PropTypes.func.isRequired,
  showDeleteMemberDialog: PropTypes.func.isRequired,
  toggleItemFreezed: PropTypes.func.isRequired,
};

MemberItem.propTypes = MemberItemPropTypes;

const OrgDepartmentItemPropTypes = {
  groupID: PropTypes.string,
};

OrgDepartmentItem.propTypes = OrgDepartmentItemPropTypes;

export default OrgDepartmentItem;
