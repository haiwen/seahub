import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { gettext, isPro } from '../../../utils/constants';
import Icon from '../../../components/icon';
import CustomDropdown from '../../../components/dropdown';

const LEFT_INDENT = 20;

const WorkWeixinDepartmentsTreeNodePropTypes = {
  index: PropTypes.number,
  leftIndent: PropTypes.number,
  department: PropTypes.object.isRequired,
  isChildrenShow: PropTypes.bool.isRequired,
  onChangeDepartment: PropTypes.func.isRequired,
  checkedDepartmentId: PropTypes.number.isRequired,
  importDepartmentDialogToggle: PropTypes.func.isRequired,
};

class WorkWeixinDepartmentsTreeNode extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isChildrenShow: false,
      isDropdownFrozen: false,
      active: false,
    };
  }

  toggleChildren = (e) => {
    e.preventDefault();
    e.stopPropagation();
    this.setState({
      isChildrenShow: !this.state.isChildrenShow,
    });
  };

  handleDropdownOpen = () => {
    this.setState({ isDropdownFrozen: true, active: true });
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

  importDepartmentDialogToggle = (depart) => {
    this.setState({ active: false });
    this.props.importDepartmentDialogToggle(depart);
  };

  componentDidMount() {
    if (this.props.index === 0) {
      this.setState({ isChildrenShow: true });
      this.props.onChangeDepartment(this.props.department.id);
    }
  }

  renderTreeNodes = (departmentsTree) => {
    if (departmentsTree.length > 0) {
      return departmentsTree.map((department) => {
        return (
          <WorkWeixinDepartmentsTreeNode
            key={department.id}
            leftIndent={this.props.leftIndent + LEFT_INDENT}
            department={department}
            isChildrenShow={this.state.isChildrenShow}
            onChangeDepartment={this.props.onChangeDepartment}
            checkedDepartmentId={this.props.checkedDepartmentId}
            importDepartmentDialogToggle={this.importDepartmentDialogToggle}
          />
        );
      });
    }
  };

  changeDept = (departmentID) => {
    const { department, checkedDepartmentId } = this.props;
    this.props.onChangeDepartment(departmentID);
    if (checkedDepartmentId === department.id && !this.state.isChildrenShow) {
      this.setState({ isChildrenShow: true });
    }
  };

  render() {
    const { isChildrenShow, department, checkedDepartmentId, leftIndent } = this.props;
    const { active } = this.state;
    return (
      <Fragment>
        {isChildrenShow &&
          <div
            className={classNames({
              'tree-node-inner': true,
              'tree-node-inner-hover': this.state.active,
              'tree-node-hight-light': checkedDepartmentId === department.id
            })}
            onClick={() => this.changeDept(department.id)}
            onMouseEnter={this.onMouseEnter}
            onMouseLeave={this.onMouseLeave}
          >
            <div className="tree-node-text" style={{ paddingLeft: leftIndent + 5 }}>
              {department.name}
            </div>
            <div className="left-icon" style={{ left: leftIndent - 20 }}>
              <span className="tree-node-icon" onClick={(e) => this.toggleChildren(e)}>
                <Icon
                  symbol="down"
                  aria-hidden="true"
                  className={classNames({ 'rotate-270': !this.state.isChildrenShow })}
                />
              </span>
            </div>
            {isPro && active &&
              <CustomDropdown
                items={[{
                  key: `${department.id}`,
                  label: '导入部门',
                  onClick: () => this.importDepartmentDialogToggle(department),
                }]}
                triggerClassName="cursor-pointer right-icon"
                menuClassName="drop-list"
                freezeItem={this.handleDropdownOpen}
                unfreezeItem={this.handleDropdownClose}
              />
            }
          </div>
        }
        {this.state.isChildrenShow &&
          <div className="department-children">
            {department.children ? this.renderTreeNodes(department.children) : <span className="ml-2 tip" style={{ paddingLeft: leftIndent + 5 }}>{'(' + gettext('No sub-departments') + ')'}</span>}
          </div>
        }
      </Fragment>
    );
  }
}

WorkWeixinDepartmentsTreeNode.propTypes = WorkWeixinDepartmentsTreeNodePropTypes;

WorkWeixinDepartmentsTreeNode.defaultProps = {
  leftIndent: LEFT_INDENT,
};

export default WorkWeixinDepartmentsTreeNode;
