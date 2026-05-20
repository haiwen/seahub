import React from 'react';
import PropTypes from 'prop-types';
import RoleSelector from '../../../components/single-selector';
import CommonOperationConfirmationDialog from '../../../components/dialog/common-operation-confirmation-dialog';
import { gettext, siteRoot } from '../../../utils/constants';
import { Utils } from '../../../utils/utils';
import CustomDropdown from '../../../components/dropdown';

const propTypes = {
  isItemFreezed: PropTypes.bool,
  member: PropTypes.object,
  setMemberStaff: PropTypes.func,
  deleteMember: PropTypes.func,
  unfreezeItem: PropTypes.func,
  freezeItem: PropTypes.func,
};

class DepartmentsV2MembersItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      highlighted: false,
      isDropdownFrozen: false,
      isDeleteMemberDialogOpen: false
    };
    this.roleOptions = [
      { value: 'Admin', text: gettext('Admin'), isSelected: false },
      { value: 'Member', text: gettext('Member'), isSelected: false }
    ];
  }

  handleMouseEnter = () => {
    if (this.props.isItemFreezed) return;
    this.setState({ highlighted: true });
  };

  handleMouseLeave = () => {
    if (this.props.isItemFreezed) return;
    this.setState({ highlighted: false });
  };

  setMemberStaff = (role) => {
    this.props.setMemberStaff(this.props.member.email, role.value === 'Admin');
  };

  deleteMember = () => {
    const { member } = this.props;
    this.props.deleteMember(member.email);
  };

  handleDropdownOpen = () => {
    this.props.freezeItem();
    this.setState({ isDropdownFrozen: true });
  };

  handleDropdownClose = () => {
    this.props.unfreezeItem();
    this.setState({ isDropdownFrozen: false, highlighted: false });
  };

  getMenuItems = () => {
    return [
      { key: 'delete', label: gettext('Delete'), onClick: this.toggleDeleteMemberDialog },
    ];
  };

  toggleItemFreezed = (freezed) => {
    if (freezed) {
      this.props.freezeItem();
    } else {
      this.props.unfreezeItem();
      this.setState({ highlighted: false });
    }
  };

  toggleDeleteMemberDialog = () => {
    this.setState({
      isDeleteMemberDialogOpen: !this.state.isDeleteMemberDialogOpen
    });
  };

  render() {
    const { member } = this.props;
    const { highlighted, isDropdownFrozen, isDeleteMemberDialogOpen } = this.state;

    this.roleOptions = this.roleOptions.map(item => {
      item.isSelected = item.value == member.role;
      return item;
    });
    const currentSelectedOption = this.roleOptions.filter(item => item.isSelected)[0];

    return (
      <>
        <tr className={`departments-members-item ${highlighted ? 'tr-highlight' : ''}`} onMouseEnter={this.handleMouseEnter} onMouseLeave={this.handleMouseLeave}>
          <td><img className="avatar" src={member.avatar_url} alt="" /></td>
          <td className='text-truncate'>
            <a href={`${siteRoot}org/useradmin/info/${encodeURIComponent(member.email)}/`}>{member.name}</a>
          </td>
          <td>
            <RoleSelector
              isDropdownToggleShown={highlighted}
              currentSelectedOption={currentSelectedOption}
              options={this.roleOptions}
              selectOption={this.setMemberStaff}
              toggleItemFreezed={this.toggleItemFreezed}
            />
          </td>
          <td>{member.contact_email}</td>
          <td>
            {(highlighted || isDropdownFrozen) &&
              <CustomDropdown
                items={this.getMenuItems()}
                triggerClassName="op-icon"
                freezeItem={this.handleDropdownOpen}
                unfreezeItem={this.handleDropdownClose}
              />
            }
          </td>
        </tr>
        {isDeleteMemberDialogOpen && (
          <CommonOperationConfirmationDialog
            title={gettext('Delete Member')}
            message={
              gettext('Are you sure you want to delete {placeholder} ?')
                .replace('{placeholder}', '<span class="op-target">' + Utils.HTMLescape(member.name) + '</span>')
            }
            executeOperation={this.deleteMember}
            confirmBtnText={gettext('Delete')}
            toggleDialog={this.toggleDeleteMemberDialog}
          />
        )}
      </>
    );
  }
}

DepartmentsV2MembersItem.propTypes = propTypes;

export default DepartmentsV2MembersItem;
