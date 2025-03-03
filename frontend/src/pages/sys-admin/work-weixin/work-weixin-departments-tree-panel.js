import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Loading from '../../../components/loading';
import WorkWeixinDepartmentsTreeNode from './work-weixin-departments-tree-node';

const WorkWeixinDepartmentsTreePanelPropTypes = {
  isTreeLoading: PropTypes.bool.isRequired,
  departmentsTree: PropTypes.array.isRequired,
  onChangeDepartment: PropTypes.func.isRequired,
  checkedDepartmentId: PropTypes.number.isRequired,
  importDepartmentDialogToggle: PropTypes.func.isRequired,
};

class WorkWeixinDepartmentsTreePanel extends Component {
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
                  <WorkWeixinDepartmentsTreeNode
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

WorkWeixinDepartmentsTreePanel.propTypes = WorkWeixinDepartmentsTreePanelPropTypes;

export default WorkWeixinDepartmentsTreePanel;
