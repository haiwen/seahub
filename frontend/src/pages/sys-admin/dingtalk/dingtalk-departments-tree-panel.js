import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Loading from '../../../components/loading';
import DingtalkDepartmentsTreeNode from './dingtalk-departments-tree-node';

const DingtalkDepartmentsTreePanelPropTypes = {
  isTreeLoading: PropTypes.bool.isRequired,
  departmentsTree: PropTypes.array.isRequired,
  onChangeDepartment: PropTypes.func.isRequired,
  checkedDepartmentId: PropTypes.number.isRequired,
  importDepartmentDialogToggle: PropTypes.func.isRequired,
};

class DingtalkDepartmentsTreePanel extends Component {
  render() {
    const { departmentsTree } = this.props;
    return (
      <div className="dir-content-nav">
        <div className="tree-view p-4">
          {this.props.isTreeLoading ?
            <Loading/> :
            <>
              {departmentsTree.length > 0 && departmentsTree.map((department, index) => {
                return (
                  <DingtalkDepartmentsTreeNode
                    key={department.id}
                    index={index}
                    department={department}
                    isChildrenShow={true}
                    onChangeDepartment={this.props.onChangeDepartment}
                    checkedDepartmentId={this.props.checkedDepartmentId}
                    importDepartmentDialogToggle={this.props.importDepartmentDialogToggle}
                  />
                );
              })}
            </>
          }
        </div>
      </div>
    );
  }
}

DingtalkDepartmentsTreePanel.propTypes = DingtalkDepartmentsTreePanelPropTypes;

export default DingtalkDepartmentsTreePanel;
