import React from 'react';
import PropTypes from 'prop-types';
import { seafileAPI } from '../../../utils/seafile-api';
import { Utils } from '../../../utils/utils';
import { gettext } from '../../../utils/constants';
import toaster from '../../../components/toast';
import RoleSelector from '../../../components/single-selector';
import UserLink from '../user-link';

const MemberItemPropTypes = {
  groupID: PropTypes.string,
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
    seafileAPI.sysAdminUpdateGroupMemberRole(this.props.groupID, this.props.member.email, isAdmin).then((res) => {
      this.props.onMemberChanged();
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
    this.setState({
      highlight: false
    });
  };

  render() {
    const member = this.props.member;
    const highlight = this.state.highlight;
    if (member.role === 'Owner') return null;
    this.roleOptions = this.roleOptions.map(item => {
      item.isSelected = item.value == member.role;
      return item;
    });
    const currentSelectedOption = this.roleOptions.filter(item => item.isSelected)[0];
    return (
      <tr className={highlight ? 'tr-highlight' : ''} onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave}>
        <td><img src={member.avatar_url} alt="member-header" width="24" className="avatar"/></td>
        <td><UserLink email={member.email} name={member.name} /></td>
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

MemberItem.propTypes = MemberItemPropTypes;

export default MemberItem;
