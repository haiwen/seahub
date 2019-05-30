import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

const WorkWeixinDepartmentsTreeNodePropTypes = {
  index: PropTypes.number,
  department: PropTypes.object.isRequired,
  isChildrenShow: PropTypes.bool.isRequired,
  onChangeDepartment: PropTypes.func.isRequired,
  checkedDepartmentId: PropTypes.number.isRequired,
};

class WorkWeixinDepartmentsTreeNode extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isChildrenShow: false,
    };
  }

  toggleChildren = () => {
    this.setState({
      isChildrenShow: !this.state.isChildrenShow,
    });
  };

  componentDidMount() {
    if (this.props.index === 0) {
      this.toggleChildren();
      this.props.onChangeDepartment(this.props.department.id);
    }
  }

  renderTreeNodes = (departmentsTree) => {
    if (departmentsTree.length > 0) {
      return departmentsTree.map((department) => {
        return (
          <WorkWeixinDepartmentsTreeNode
            key={department.id}
            department={department}
            isChildrenShow={this.state.isChildrenShow}
            onChangeDepartment={this.props.onChangeDepartment}
            checkedDepartmentId={this.props.checkedDepartmentId}
          />
        );
      });
    }
  };

  render() {
    const { isChildrenShow, department, checkedDepartmentId } = this.props;
    let toggleClass = classNames({
      'folder-toggle-icon fa fa-caret-down': department.children && this.state.isChildrenShow,
      'folder-toggle-icon fa fa-caret-right': department.children && !this.state.isChildrenShow,
    })
    let nodeInnerClass = classNames({
      'tree-node-inner': true,
      'tree-node-hight-light': checkedDepartmentId === department.id
    });
    return (
      <Fragment>
        {isChildrenShow &&
          <div className={nodeInnerClass}>
            <i className={toggleClass} onClick={() => this.toggleChildren()}></i>{' '}
            <span className="tree-node-text" onClick={() => this.props.onChangeDepartment(department.id)}>{department.name}</span>
          </div>
        }
        {this.state.isChildrenShow &&
          <div className="department-children">
            {department.children && this.renderTreeNodes(department.children)}
          </div>
        }
      </Fragment>
    );
  }
}

WorkWeixinDepartmentsTreeNode.propTypes = WorkWeixinDepartmentsTreeNodePropTypes;

export default WorkWeixinDepartmentsTreeNode;
