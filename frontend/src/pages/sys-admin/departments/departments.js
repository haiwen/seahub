import React from 'react';
import PropTypes from 'prop-types';
import '../../../css/org-department-item.css';

class Departments extends React.Component {
  render() {
    return (
      <div className="h-100 org-departments">
        {this.props.children}
      </div>
    );
  }
}

Departments.propTypes = {
  children: PropTypes.any.isRequired,
};

export default Departments;
