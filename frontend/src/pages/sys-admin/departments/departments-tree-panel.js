import React, { Component } from 'react';
import PropTypes from 'prop-types';
import DepartmentTreeNode from './tree-node';

const DepartmentsTreePanelPropTypes = {
  rootNodes: PropTypes.array,
  checkedDepartmentId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  onChangeDepartment: PropTypes.func,
  listSubDepartments: PropTypes.func,
  toggleAddDepartment: PropTypes.func,
  toggleAddLibrary: PropTypes.func,
  toggleAddMembers: PropTypes.func,
  toggleRename: PropTypes.func,
  toggleDelete: PropTypes.func
};

class DepartmentsTreePanel extends Component {
  render() {
    const { rootNodes, checkedDepartmentId } = this.props;
    return (
      <div className="departments-tree-panel">
        {rootNodes.map(rootNode => {
          return (
            <DepartmentTreeNode
              key={rootNode.id}
              node={rootNode}
              checkedDepartmentId={checkedDepartmentId}
              onChangeDepartment={this.props.onChangeDepartment}
              listSubDepartments={this.props.listSubDepartments}
              toggleAddDepartment={this.props.toggleAddDepartment}
              toggleAddLibrary={this.props.toggleAddLibrary}
              toggleAddMembers={this.props.toggleAddMembers}
              toggleRename={this.props.toggleRename}
              toggleDelete={this.props.toggleDelete}
            />
          );
        })}
      </div>
    );
  }
}

DepartmentsTreePanel.propTypes = DepartmentsTreePanelPropTypes;

export default DepartmentsTreePanel;
