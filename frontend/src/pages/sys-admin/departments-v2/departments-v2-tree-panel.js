import React, { Component } from 'react';
import PropTypes from 'prop-types';
import DepartmentsV2TreeNode from './departments-v2-tree-node';

const DepartmentV2TreePanelPropTypes = {
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

class DepartmentV2TreePanel extends Component {
  render() {
    const { rootNodes, checkedDepartmentId } = this.props;
    return (
      <div className="departments-tree-panel">
        {rootNodes.map(rootNode => {
          return (
            <DepartmentsV2TreeNode
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

DepartmentV2TreePanel.propTypes = DepartmentV2TreePanelPropTypes;

export default DepartmentV2TreePanel;
