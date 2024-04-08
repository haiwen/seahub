import React from 'react';
import PropTypes from 'prop-types';
import '../../css/org-department-item.css';

class OrgDepartments extends React.Component {
  render() {
    return (
      <div className="h-100 org-departments">
        {this.props.children}
      </div>
    );
  }
}

OrgDepartments.propTypes = {
  children: PropTypes.any.isRequired,
};

export default OrgDepartments;
