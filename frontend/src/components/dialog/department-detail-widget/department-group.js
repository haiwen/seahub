import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Loading from '../../../components/loading';
import { gettext, isOrgContext } from '../../../utils/constants';

const ItemPropTypes = {
  department: PropTypes.object,
  departments: PropTypes.array,
  getMembers: PropTypes.func.isRequired,
  setCurrent: PropTypes.func.isRequired,
  toggleExpanded: PropTypes.func.isRequired,
  currentDepartment: PropTypes.object,
  allMembersClick: PropTypes.bool,
};

class Item extends Component {

  getMembers = (e) => {
    e.stopPropagation();
    const { department } = this.props;
    this.props.getMembers(department.id);
    this.props.setCurrent(department);
  }

  toggleExpanded = (e) => {
    e.stopPropagation();
    this.props.toggleExpanded(this.props.department.id, !this.props.department.isExpanded);
  }

  renderSubDepartments = () => {
    const { departments } = this.props;
    return (
      <div style={{paddingLeft: '10px'}}>
        {departments.map((department, index) => {
          if (department.parent_group_id !== this.props.department.id) return null;
          return (
            <Item
              key={department.id}
              department={department}
              departments={departments}
              getMembers={this.props.getMembers}
              setCurrent={this.props.setCurrent}
              toggleExpanded={this.props.toggleExpanded}
              currentDepartment={this.props.currentDepartment}
              allMembersClick={this.props.allMembersClick}
            />
          );
        })}
      </div>
    );
  }

  render() {
    const { department, currentDepartment, allMembersClick } = this.props;
    const isCurrent = !allMembersClick && currentDepartment.id === department.id;
    const { hasChild, isExpanded } = department;
    return (
      <>
        <div className={isCurrent ? 'tr-highlight group-item' : 'group-item'} onClick={this.getMembers}>
          {hasChild &&
            <span
              className={`dtable-font dtable-icon-${isExpanded ? 'drop-down' : 'right-slide'} pr-2`}
              onClick={this.toggleExpanded}
              style={{color: isCurrent ? '#fff' : '#999', fontSize: '12px'}}
            ></span>
          }
          <span style={hasChild ? {} : {paddingLeft: '20px'}}>{department.name}</span>
        </div>
        {(isExpanded && hasChild) && this.renderSubDepartments()}
      </>
    );
  }
}

Item.propTypes = ItemPropTypes;


const DepartmentGroupPropTypes = {
  departments: PropTypes.array.isRequired,
  getMembers: PropTypes.func.isRequired,
  setCurrent: PropTypes.func.isRequired,
  currentDepartment: PropTypes.object.isRequired,
  loading: PropTypes.bool,
  getOrgMembers: PropTypes.func,
  departmentsTree: PropTypes.array,
};

class DepartmentGroup extends Component {

  constructor(props) {
    super(props);
    this.state = {
      allMembersClick: !!isOrgContext
    };
  }

  toggleExpanded = (id, state) => {
    let departments = this.props.departmentsTree.slice(0);
    let index = departments.findIndex(item => item.id === id);
    departments[index].isExpanded = state;
    this.setState({ departments });
  }

  getMembers = (department_id) => {
    this.props.getMembers(department_id);
    this.setState({allMembersClick: false});
  }
  
  getOrgMembers = () => {
    this.props.getOrgMembers();
    this.setState({
      allMembersClick: true
    });
  }

  render() {
    const { loading } = this.props;
    let departments = this.props.departmentsTree;
    if (loading) {
      return (<Loading/>);
    }
    const { allMembersClick } = this.state;
    return (
      <div className="department-dialog-group">
        <div>
          {isOrgContext &&
            <div className={allMembersClick ? 'tr-highlight group-item' : 'group-item'} onClick={this.getOrgMembers}>
              <span
                className={'dtable-font pr-2'}
                style={{color: allMembersClick ? '#fff' : '#999', fontSize: '12px'}}
              />
              <span>{gettext('All users')}</span>
            </div>
          }
          {departments.length > 0 && departments.map((department, index) => {
            if (department.parent_group_id !== -1) return null;
            return (
              <Item
                key={department.id}
                department={department}
                departments={departments}
                getMembers={this.getMembers}
                setCurrent={this.props.setCurrent}
                toggleExpanded={this.toggleExpanded}
                currentDepartment={this.props.currentDepartment}
                allMembersClick={this.state.allMembersClick}
              />
            );
          })}
        </div>
      </div>
    );
  }
}

DepartmentGroup.propTypes = DepartmentGroupPropTypes;

export default DepartmentGroup;
