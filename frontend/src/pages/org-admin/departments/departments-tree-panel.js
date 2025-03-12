import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../../utils/constants';
import TreeNode from './tree-node';

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
      <div className="departments-tree-panel p-4">
        {rootNodes.map(rootNode => {
          return (
            <TreeNode
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
        <button
          className='btn btn-secondary btn-block text-left border-0 font-weight-normal new-dept-btn shadow-none'
          onClick={() => {this.props.toggleAddDepartment(null);}}
        >
          <i className="sf3-font sf3-font-new new-dept-btn-icon"></i>
          {gettext('New Department')}
        </button>
      </div>
    );
  }
}

DepartmentsTreePanel.propTypes = DepartmentsTreePanelPropTypes;

export default DepartmentsTreePanel;
