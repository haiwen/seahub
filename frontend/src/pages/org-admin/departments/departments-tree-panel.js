import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../../utils/constants';
import TreeNode from './tree-node';
import Icon from '../../../components/icon';

const DepartmentsTreePanelPropTypes = {
  rootNodes: PropTypes.array,
  checkedDepartmentId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  onChangeDepartment: PropTypes.func,
  listSubDepartments: PropTypes.func,
  toggleAddDepartment: PropTypes.func,
  toggleSetQuotaDialog: PropTypes.func,
  toggleAddLibrary: PropTypes.func,
  toggleAddMembers: PropTypes.func,
  toggleRename: PropTypes.func,
  toggleDelete: PropTypes.func,
  toggleMoveDepartment: PropTypes.func,
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
              toggleSetQuotaDialog={this.props.toggleSetQuotaDialog}
              toggleAddLibrary={this.props.toggleAddLibrary}
              toggleAddMembers={this.props.toggleAddMembers}
              toggleRename={this.props.toggleRename}
              toggleDelete={this.props.toggleDelete}
              toggleMoveDepartment={this.props.toggleMoveDepartment}
            />
          );
        })}
        <button
          className='btn btn-secondary w-100 h-6 d-flex align-items-center text-start border-0 font-weight-normal new-dept-btn shadow-none'
          onClick={() => {this.props.toggleAddDepartment(null);}}
        >
          <span className="d-flex align-items-center">
            <Icon symbol="new" className="new-dept-btn-icon" />
          </span>
          {gettext('New Department')}
        </button>
      </div>
    );
  }
}

DepartmentsTreePanel.propTypes = DepartmentsTreePanelPropTypes;

export default DepartmentsTreePanel;
