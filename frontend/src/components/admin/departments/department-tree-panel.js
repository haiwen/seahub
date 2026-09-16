import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { gettext } from '@/utils/constants';
import Icon from '../../icon';
import DepartmentTreeNode from './department-tree-node';

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

class DepartmentTreePanel extends Component {
  render() {
    const { rootNodes, checkedDepartmentId } = this.props;

    return (
      <div className="departments-tree-panel p-4">
        {rootNodes.map(rootNode => {
          return (
            <DepartmentTreeNode
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
          className="btn btn-secondary btn-sm w-100 d-flex align-items-center text-start font-weight-normal new-dept-btn"
          onClick={() => {this.props.toggleAddDepartment(null);}}
        >
          <Icon symbol="new" className="new-dept-btn-icon mr-1" />
          {gettext('New Department')}
        </button>
      </div>
    );
  }
}

DepartmentTreePanel.propTypes = DepartmentsTreePanelPropTypes;

export default DepartmentTreePanel;
