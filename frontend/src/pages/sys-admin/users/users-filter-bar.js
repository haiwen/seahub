import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../../utils/constants';
import Selector from '../../../components/single-selector';
import './users-filter-bar.css';

const { availableRoles } = window.sysadmin.pageOptions;

class UsersFilterBar extends Component {

  translateRole = (role) => {
    switch (role) {
      case '':
        return gettext('All');
      case 'default':
        return gettext('Default');
      case 'guest':
        return gettext('Guest');
      default:
        return role;
    }
  };

  selectStatusOption = (option) => {
    this.props.onStatusChange(option.value);
  };

  selectRoleOption = (option) => {
    this.props.onRoleChange(option.value);
  };

  render() {
    const { isActive, role } = this.props;

    this.statusOptions = [
      { value: '', text: gettext('All') },
      { value: '1', text: gettext('Active') },
      { value: '0', text: gettext('Inactive') }
    ].map(item => {
      item.isSelected = isActive == item.value;
      return item;
    });
    const currentSelectedStatusOption = this.statusOptions.filter(item => item.isSelected)[0];

    this.roleOptions = [''].concat(availableRoles).map(item => {
      return {
        value: item,
        text: this.translateRole(item),
        isSelected: item == role
      };
    });
    const currentSelectedRoleOption = this.roleOptions.filter(item => item.isSelected)[0] || { // `|| {...}`: to be compatible with old data(roles not in the present  `availableRoles`
      value: role,
      text: this.translateRole(role),
      isSelected: true
    };

    return (
      <div className="users-filter-bar mt-4 mb-2 d-flex align-items-center">
        <span className="filter-item mr-2">{`${gettext('Status')}:`}</span>
        <Selector
          isDropdownToggleShown={true}
          currentSelectedOption={currentSelectedStatusOption}
          options={this.statusOptions}
          selectOption={this.selectStatusOption}
        />

        <span className="filter-item mr-2 ml-4">{`${gettext('Role')}:`}</span>
        <Selector
          isDropdownToggleShown={true}
          currentSelectedOption={currentSelectedRoleOption}
          options={this.roleOptions}
          selectOption={this.selectRoleOption}
        />
      </div>
    );
  }
}

UsersFilterBar.propTypes = {
  onStatusChange: PropTypes.func,
  onRoleChange: PropTypes.func,
  role: PropTypes.string,
  isActive: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

export default UsersFilterBar;
