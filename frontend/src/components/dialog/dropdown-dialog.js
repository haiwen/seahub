import React, { Component } from 'react';
import { gettext } from '../../utils/constants';
import PropTypes from 'prop-types';

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
            <option value="active">Active</option>
            <option value="inactive">Not active</option>
          </select>
        </div>
        <div style={styles.filterContainer}>
          <label style={styles.filterLabel}>Role</label>
          <select style={styles.filterSelect} onChange={this.handleRoleChange} value={this.props.role}>
            <option value="default">Default</option>
            <option value="guest">Guest</option>
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
  isActive: PropTypes.string
};
export default DropdownComponent;
