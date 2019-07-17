import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { Dropdown, DropdownItem, DropdownMenu, DropdownToggle } from 'reactstrap';
import { gettext, isPro } from '../../../utils/constants';

const WorkWeixinDepartmentsTreeNodePropTypes = {
  index: PropTypes.number,
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
      dropdownOpen: false,
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

  dropdownToggle = () => {
    this.setState({ dropdownOpen: !this.state.dropdownOpen });
  };

  onMouseEnter = () => {
    this.setState({ active: true });
  };

  onMouseLeave = () => {
    this.setState({ active: false });
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
            department={department}
            isChildrenShow={this.state.isChildrenShow}
            onChangeDepartment={this.props.onChangeDepartment}
            checkedDepartmentId={this.props.checkedDepartmentId}
            importDepartmentDialogToggle={this.props.importDepartmentDialogToggle}
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
    });
    let nodeInnerClass = classNames({
      'tree-node-inner': true,
      'tree-node-hight-light': checkedDepartmentId === department.id
    });
    return (
      <Fragment>
        {isChildrenShow &&
          <div
            className={nodeInnerClass}
            onClick={() => this.props.onChangeDepartment(department.id)}
            onMouseEnter={this.onMouseEnter}
            onMouseLeave={this.onMouseLeave}
          >
            <i className={toggleClass} onClick={(e) => this.toggleChildren(e)}></i>{' '}
            <span className="tree-node-text">{department.name}</span>
            {isPro &&
            <Dropdown
              isOpen={this.state.dropdownOpen}
              toggle={this.dropdownToggle}
              direction="down"
              style={this.state.active ? {} : { opacity: 0 }}
            >
              <DropdownToggle
                tag='i'
                className='fa fa-ellipsis-v cursor-pointer attr-action-icon'
                title={gettext('More Operations')}
                data-toggle="dropdown"
                aria-expanded={this.state.dropdownOpen}
              >
              </DropdownToggle>
              <DropdownMenu className="drop-list" right={true}>
                <DropdownItem
                  onClick={this.props.importDepartmentDialogToggle.bind(this, department)}
                  id={department.id}
                >{'导入部门'}</DropdownItem>
              </DropdownMenu>
            </Dropdown>
            }
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
