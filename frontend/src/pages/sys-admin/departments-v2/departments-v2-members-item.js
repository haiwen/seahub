import React from 'react';
import PropTypes from 'prop-types';
import { Link } from '@gatsbyjs/reach-router';
import { Dropdown, DropdownToggle, DropdownMenu, DropdownItem } from 'reactstrap';
import RoleSelector from '../../../components/single-selector';
import { gettext, siteRoot } from '../../../utils/constants';
import { getRoleOptions } from './role-status-utils';

const propTypes = {
  isItemFreezed: PropTypes.bool,
  member: PropTypes.object,
  setMemberStaff: PropTypes.func,
  deleteMember: PropTypes.func,
  unfreezeItem: PropTypes.func,
  freezeItem: PropTypes.func,
  toggleItemFreezed: PropTypes.func,
};

class DepartmentsV2MembersItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      dropdownOpenEmail: '',
      isShowDropdownMenu: false,
      isItemMenuShow: false,
    };
    this.roles = ['Admin', 'Member'];
  }

  onMouseEnter = () => {
    if (!this.props.isItemFreezed) {
      this.setState({ isShowDropdownMenu: true });
    }
  };

  onMouseLeave = () => {
    if (!this.props.isItemFreezed) {
      this.setState({ isShowDropdownMenu: false });
    }
  };

  setMemberStaff = (role) => {
    this.props.setMemberStaff(this.props.member.email, role.value === 'Admin');
  };

  deleteMember = (e) => {
    e.stopPropagation();
    const { member } = this.props;
    this.props.deleteMember(member.email);
  };

  toggleDropdownMenu = () => {
    this.setState({
      isItemMenuShow: !this.state.isItemMenuShow
    }, () => {
      if (this.state.isItemMenuShow && typeof(this.props.freezeItem) === 'function') {
        this.props.freezeItem();
      } else if (!this.state.isItemMenuShow && typeof(this.props.unfreezeItem) === 'function') {
        this.props.unfreezeItem();
      }
    });
  };

  translateRole = (role) => {
    if (role === 'Admin') {
      return gettext('Admin');
    } else if (role === 'Member') {
      return gettext('Default member');
    }
  };

  render() {
    const { member, freezeItem, unfreezeItem } = this.props;
    const { isShowDropdownMenu, isItemMenuShow } = this.state;
    const currentRole = member.role;
    const options = getRoleOptions(this.roles) || [];
    const option = options.find(item => item.value === currentRole) || {};

    return (
      <tr className="departments-members-item" key={member.email} onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave}>
        <td><img className="avatar" src={member.avatar_url} alt=""></img></td>
        <td className='text-truncate'>
          <Link to={`${siteRoot}sys/users/${encodeURIComponent(member.email)}/`}>{member.name}</Link>
        </td>
        <td>
          <RoleSelector
            isDropdownToggleShown={isShowDropdownMenu}
            currentSelectedOption={option}
            options={options}
            selectOption={this.setMemberStaff}
            toggleItemFreezed={(freeze) => { freeze ? freezeItem() : unfreezeItem(); }}
          />
        </td>
        <td>{member.contact_email}</td>
        <td>
          {isShowDropdownMenu &&
            <Dropdown
              isOpen={isItemMenuShow}
              toggle={this.toggleDropdownMenu}
              direction="down"
            >
              <DropdownToggle
                tag='a'
                role="button"
                className='attr-action-icon sf3-font sf3-font-more-vertical'
                title={gettext('More operations')}
                aria-label={gettext('More operations')}
                data-toggle="dropdown"
              />
              <DropdownMenu right={true}>
                <DropdownItem key='delete' onClick={this.deleteMember}>{gettext('Delete')}</DropdownItem>
              </DropdownMenu>
            </Dropdown>
          }
        </td>
      </tr>
    );
  }
}

DepartmentsV2MembersItem.propTypes = propTypes;

export default DepartmentsV2MembersItem;
