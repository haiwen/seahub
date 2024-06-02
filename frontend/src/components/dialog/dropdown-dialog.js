import React, { Component } from 'react';
import { gettext } from '../../utils/constants';
import PropTypes from 'prop-types';
const { availableRoles } = window.sysadmin.pageOptions;

class DropdownComponent extends Component {
  constructor(props) {
    super(props);
  }


  handleStatusChange = (event) => {
    this.props.handleFilterActive(event.target.value);
  };

  handleRoleChange = (event) => {
    this.props.handleFilterRole(event.target.value);
  };

  translateRole = (role) => {
    switch (role) {
      case 'default':
        return gettext('Default');
      case 'guest':
        return gettext('Guest');
      default:
        return role;
    }
  };

  render() {
    const styles = {
      filterBar: {
        marginTop: '16px',
        marginBottom: '8px',
        display: 'flex',
        alignItems: 'center'
      },
      filterContainer: {
        marginRight: '20px',
      },
      filterLabel: {
        marginRight: '8px',
        fontSize: '14px',
        color: '#000'
      },
      filterSelect: {
        height: '30px',
        backgroundColor: '#F5F5F5',
        border: '1px solid #ddd',
        color: '#333',
        fontSize: '14px'
      }
    };
    return (
      <div style={styles.filterBar}>
        <div style={styles.filterContainer}>
          <label style={styles.filterLabel}>{gettext('Status')}</label>
          <select style={styles.filterSelect} onChange={this.handleStatusChange} value={this.props.isActive}>
            <option value="">{gettext('all')}</option>
            <option value={1}>{gettext('Active')}</option>
            <option value={0}>{gettext('Inactive')}</option>
          </select>
        </div>
        <div style={styles.filterContainer}>
          <label style={styles.filterLabel}>Role</label>
          <select style={styles.filterSelect} onChange={this.handleRoleChange} value={this.props.role}>
              <option value=''>{gettext('all')}</option>
              {availableRoles.map((item, index) => {
                return (<option value={item}>{this.translateRole(item)}</option>)
              })
            }

          </select>
        </div>
      </div>
    );
  }
}

DropdownComponent.propTypes = {
  loading: PropTypes.bool,
  curPerPage: PropTypes.number,
  sortBy: PropTypes.string,
  currentPage: PropTypes.number,
  sortOrder: PropTypes.string,
  handleFilterActive: PropTypes.func,
  handleFilterRole: PropTypes.func,
  role: PropTypes.string,
  isActive: PropTypes.string,
  availableRoles: PropTypes.array,
};
export default DropdownComponent;
