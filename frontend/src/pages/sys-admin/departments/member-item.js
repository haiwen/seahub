import React from 'react';
import PropTypes from 'prop-types';
import { seafileAPI } from '../../../utils/seafile-api';
import { Utils } from '../../../utils/utils.js';
import toaster from '../../../components/toast';
import RoleEditor from '../../../components/select-editor/role-editor';
import UserLink from '../user-link';

const MemberItemPropTypes = {
  groupID: PropTypes.string.isRequired,
  member: PropTypes.object.isRequired,
  isItemFreezed: PropTypes.bool.isRequired,
  onMemberChanged: PropTypes.func.isRequired,
  showDeleteMemberDialog: PropTypes.func.isRequired,
  toggleItemFreezed: PropTypes.func.isRequired,
};

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
    seafileAPI.sysAdminUpdateGroupMemberRole(this.props.groupID, this.props.member.email, isAdmin).then((res) => {
      this.props.onMemberChanged();
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
    this.setState({
      highlight: false
    });
  }

  render() {
    const member = this.props.member;
    const highlight = this.state.highlight;
    if (member.role === 'Owner') return null;
    return (
      <tr className={highlight ? 'tr-highlight' : ''} onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave}>
        <td><img src={member.avatar_url} alt="member-header" width="24" className="avatar"/></td>
        <td><UserLink email={member.email} name={member.name} /></td>
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

MemberItem.propTypes = MemberItemPropTypes;

export default MemberItem;
