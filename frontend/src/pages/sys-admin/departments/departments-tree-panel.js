import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../../utils/constants';
import DepartmentTreeNode from './tree-node';
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
              toggleMoveDepartment={this.props.toggleMoveDepartment}
              toggleRename={this.props.toggleRename}
              toggleDelete={this.props.toggleDelete}
            />
          );
        })}
        <button
          className='btn btn-secondary w-100 h-5 d-flex align-items-center text-start border-0 font-weight-normal new-dept-btn shadow-none'
          onClick={() => {this.props.toggleAddDepartment(null);}}
        >
          <Icon symbol="new" className="new-dept-btn-icon mr-1" />
          {gettext('New Department')}
        </button>
      </div>
    );
  }
}

DepartmentsTreePanel.propTypes = DepartmentsTreePanelPropTypes;

export default DepartmentsTreePanel;
