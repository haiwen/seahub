import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Loading from '../../loading';
import { isOrgContext } from '../../../utils/constants';
import { gettext } from '@/utils/constants';
import Icon from '../../icon';
import { Utils } from '../../../utils/utils';

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
  };

  toggleExpanded = (e) => {
    e.stopPropagation();
    this.props.toggleExpanded(this.props.department.id, !this.props.department.isExpanded);
  };

  renderSubDepartments = () => {
    const { departments } = this.props;
    return (
      <div>
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
              padding={this.props.padding + 10}
            />
          );
        })}
      </div>
    );
  };

  render() {
    const { department, currentDepartment, allMembersClick } = this.props;
    const isCurrent = !allMembersClick && currentDepartment.id === department.id;
    const { hasChild, isExpanded } = department;
    return (
      <>
        <div
          className={isCurrent ? 'tr-highlight group-item' : 'group-item'}
          onClick={this.getMembers}
          style={{ paddingLeft: `${this.props.padding}px` }}
          role="button"
          tabIndex={0}
          onKeyDown={Utils.onKeyDown}
        >
          {hasChild &&
            <span
              className={`${isExpanded ? '' : 'rotate-270'} d-inline-flex align-items-center`}
              onClick={this.toggleExpanded}
              style={{ color: '#666' }}
              role="button"
              aria-label={gettext('Toggle department group menu')}
            >
              <Icon symbol="arrow-down" />
            </span>
          }
          <span style={hasChild ? { paddingLeft: '8px' } : { paddingLeft: '20px' }}>{department.name}</span>
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
  };

  getMembers = (department_id) => {
    this.props.getMembers(department_id);
    this.setState({ allMembersClick: false });
  };

  render() {
    const { loading } = this.props;
    let departments = this.props.departmentsTree;
    if (loading) {
      return (<Loading/>);
    }
    return (
      <div className="department-dialog-group">
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
              padding={10}
            />
          );
        })}
      </div>
    );
  }
}

DepartmentGroup.propTypes = DepartmentGroupPropTypes;

export default DepartmentGroup;
