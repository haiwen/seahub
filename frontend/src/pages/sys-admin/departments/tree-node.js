import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import Icon from '../../../components/icon';
import { getDepartmentMenuItems } from './departments-node-dropdown-menu';
import CustomDropdown from '../../../components/dropdown';

const departmentsTreeNodePropTypes = {
  node: PropTypes.object,
  checkedDepartmentId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  listSubDepartments: PropTypes.func,
  onChangeDepartment: PropTypes.func,
  toggleAddDepartment: PropTypes.func,
  toggleSetQuotaDialog: PropTypes.func,
  toggleAddLibrary: PropTypes.func,
  toggleAddMembers: PropTypes.func,
  toggleRename: PropTypes.func,
  toggleDelete: PropTypes.func,
  toggleMoveDepartment: PropTypes.func,
};

class DepartmentsTreeNode extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isChildrenShow: false,
      isDropdownFrozen: false,
      active: false
    };
  }

  componentDidMount() {
    const { node } = this.props;
    if (node.id === -1) {
      this.listSubDepartments();
    }
  }

  toggleChildren = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (this.state.isChildrenShow) {
      this.setState({ isChildrenShow: false });
      return;
    }
    this.listSubDepartments();
  };

  listSubDepartments = () => {
    const { node } = this.props;
    this.props.listSubDepartments(node.id, (childrenNodes) => {
      this.setState({ isChildrenShow: true });
    });
  };

  handleDropdownOpen = () => {
    this.setState({ isDropdownFrozen: true });
  };

  handleDropdownClose = () => {
    this.setState({ isDropdownFrozen: false, active: false });
  };

  onMouseEnter = () => {
    this.setState({ active: true });
  };

  onMouseLeave = () => {
    if (this.state.isDropdownFrozen) return;
    this.setState({ active: false });
  };

  renderTreeNodes = (nodes) => {
    if (nodes.length > 0) {
      return nodes.map((node) => {
        return (
          <DepartmentsTreeNode
            key={node.id}
            node={node}
            onChangeDepartment={this.props.onChangeDepartment}
            checkedDepartmentId={this.props.checkedDepartmentId}
            listSubDepartments={this.props.listSubDepartments}
            toggleAddDepartment={this.props.toggleAddDepartment}
            toggleSetQuotaDialog={this.props.toggleSetQuotaDialog}
            toggleAddMembers={this.props.toggleAddMembers}
            toggleRename={this.props.toggleRename}
            toggleDelete={this.props.toggleDelete}
            toggleAddLibrary={this.props.toggleAddLibrary}
            toggleMoveDepartment={this.props.toggleMoveDepartment}
          />
        );
      });
    }
  };

  changeDept = (nodeId) => {
    const { node, checkedDepartmentId } = this.props;
    const { isChildrenShow } = this.state;
    if (checkedDepartmentId !== node.id) {
      this.props.onChangeDepartment(nodeId);
    }
    if (checkedDepartmentId === node.id) {
      if (isChildrenShow) {
        this.setState({ isChildrenShow: false });
        return;
      }
      this.listSubDepartments();
    }
  };

  render() {
    const { node, checkedDepartmentId } = this.props;
    const { isChildrenShow, isDropdownFrozen, active } = this.state;

    let nodeInnerClass = classNames({
      'tree-node': true,
      'active': checkedDepartmentId === node.id
    });
    return (
      <Fragment>
        <div
          className={nodeInnerClass}
          onClick={() => this.changeDept(node.id)}
          onMouseEnter={this.onMouseEnter}
          onMouseLeave={this.onMouseLeave}
        >
          <span className="departments-v2-tree-icon" onClick={(e) => this.toggleChildren(e)}>
            <Icon symbol="down" className={isChildrenShow ? '' : 'rotate-270'} aria-hidden="true" />
          </span>
          <span className="departments-v2-tree-node-text text-truncate">{node.name}</span>
          {(active || isDropdownFrozen) &&
            <CustomDropdown
              className="mr-2"
              items={getDepartmentMenuItems({
                node,
                toggleAddDepartment: this.props.toggleAddDepartment,
                toggleSetQuotaDialog: this.props.toggleSetQuotaDialog,
                toggleAddLibrary: this.props.toggleAddLibrary,
                toggleAddMembers: this.props.toggleAddMembers,
                toggleMoveDepartment: this.props.toggleMoveDepartment,
                toggleRename: this.props.toggleRename,
                toggleDelete: this.props.toggleDelete,
              })}
              triggerClassName="right-icon"
              freezeItem={this.handleDropdownOpen}
              unfreezeItem={this.handleDropdownClose}
            />
          }
        </div>
        {this.state.isChildrenShow &&
          <div className="tree-node-children">
            {node.children && this.renderTreeNodes(node.children)}
          </div>
        }
      </Fragment>
    );
  }
}

DepartmentsTreeNode.propTypes = departmentsTreeNodePropTypes;

export default DepartmentsTreeNode;
