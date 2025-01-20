import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Dropdown, DropdownToggle, DropdownItem, DropdownMenu } from 'reactstrap';
import { gettext } from '../../../utils/constants';
import './users-filter-bar.css';

const { availableRoles } = window.sysadmin.pageOptions;

class UsersFilterBar extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isStatusOpen: false,
      isRoleOpen: false,
    };
  }

  translateStatus = (status) => {
    switch (status) {
      case '0':
        return gettext('Inactive');
      case '1':
        return gettext('Active');
      default:
        return gettext('All');
    }
  };

  translateRole = (role) => {
    switch (role) {
      case 'default':
        return gettext('Default');
      case 'guest':
        return gettext('Guest');
      default:
        return gettext('All');
    }
  };

  toggleStatusDropdown = () => {
    this.setState({ isStatusOpen: !this.state.isStatusOpen });
  };

  toggleRoleDropdown = () => {
    this.setState({ isRoleOpen: !this.state.isRoleOpen });
  };

  renderCheck = () => {
    return <span className="sf2-icon-tick text-gray font-weight-bold"></span>;
  };

  render() {
    const { onStatusChange, onRoleChange } = this.props;
    return (
      <div className="users-filter-bar mt-4 mb-2 d-flex">
        <Dropdown isOpen={this.state.isStatusOpen} toggle={this.toggleStatusDropdown}>
          <DropdownToggle
            tag="span"
            data-toggle="dropdown"
            aria-expanded={this.state.isStatusOpen}
            className="users-filter-bar-dropdown-toggle"
          >
            <span>{gettext('Status')}{': '}{this.translateStatus(this.props.isActive)}</span>
            <span className='sf3-font-down sf3-font'></span>
          </DropdownToggle>
          <DropdownMenu>
            <DropdownItem key={0} onClick={() => { onStatusChange(''); }}>
              <span>{gettext('All')}</span>{this.props.isActive === '' && this.renderCheck()}
            </DropdownItem>
            <DropdownItem key={1} onClick={() => { onStatusChange('1'); }}>
              <span>{gettext('Active')}</span>{this.props.isActive === '1' && this.renderCheck()}
            </DropdownItem>
            <DropdownItem key={2} onClick={() => { onStatusChange('0'); }}>
              <span>{gettext('Inactive')}</span>{this.props.isActive === '0' && this.renderCheck()}
            </DropdownItem>
          </DropdownMenu>
        </Dropdown>
        <Dropdown isOpen={this.state.isRoleOpen} toggle={this.toggleRoleDropdown} className="ml-4">
          <DropdownToggle
            tag="span"
            data-toggle="dropdown"
            aria-expanded={this.state.isRoleOpen}
            className="users-filter-bar-dropdown-toggle"
          >
            <span>{gettext('Role')}{': '}{this.translateRole(this.props.role)}</span>
            <span className='sf3-font-down sf3-font'></span>
          </DropdownToggle>
          <DropdownMenu>
            <DropdownItem key={0} onClick={() => { onRoleChange(''); }}>
              <span>{gettext('All')}</span>
              {this.props.role === '' && this.renderCheck()}
            </DropdownItem>
            {availableRoles.map((item, index) => {
              return (
                <DropdownItem key={index} onClick={() => { onRoleChange(item); }}>
                  <span>{this.translateRole(item)}</span>
                  {this.props.role === item && this.renderCheck()}
                </DropdownItem>
              );
            })}
          </DropdownMenu>
        </Dropdown>
      </div>
    );
  }
}

UsersFilterBar.propTypes = {
  loading: PropTypes.bool,
  curPerPage: PropTypes.number,
  sortBy: PropTypes.string,
  currentPage: PropTypes.number,
  sortOrder: PropTypes.string,
  onStatusChange: PropTypes.func,
  onRoleChange: PropTypes.func,
  role: PropTypes.string,
  isActive: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

export default UsersFilterBar;
