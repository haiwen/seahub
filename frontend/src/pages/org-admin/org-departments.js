import React from 'react';
import OrgDepartmentsList from './org-departments-list';
import OrgDepartmentItem from './org-department-item';

class OrgDepartments extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      activeGroup: null,
    };
  }

  setActiveGroup = (group) => {
    this.setState({
      activeGroup: group
    });
  }

  render() {
    return (
      <div className="h-100">
        {this.state.activeGroup ?
          <OrgDepartmentItem setActiveGroup={this.setActiveGroup} activeGroup={this.state.activeGroup}/>
          :
          <OrgDepartmentsList setActiveGroup={this.setActiveGroup} activeGroup={this.state.activeGroup}/>
        }        
      </div>
    );
  }
}

export default OrgDepartments;
