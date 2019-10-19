import React from 'react';
import '../../../css/org-department-item.css';

class Departments extends React.Component {

  constructor(props) {
    super(props);
  }

  render() {
    return (
      <div className="h-100 org-departments">
        {this.props.children}
      </div>
    );
  }
}

export default Departments;
