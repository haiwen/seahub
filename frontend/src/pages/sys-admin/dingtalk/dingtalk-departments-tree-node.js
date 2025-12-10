import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { Dropdown, DropdownItem, DropdownMenu, DropdownToggle } from 'reactstrap';
import { gettext, isPro } from '../../../utils/constants';
import Icon from '../../../components/icon';

const DingtalkDepartmentsTreeNodePropTypes = {
  index: PropTypes.number,
  department: PropTypes.object.isRequired,
  isChildrenShow: PropTypes.bool.isRequired,
  onChangeDepartment: PropTypes.func.isRequired,
  checkedDepartmentId: PropTypes.number.isRequired,
  importDepartmentDialogToggle: PropTypes.func.isRequired,
};

class DingtalkDepartmentsTreeNode extends Component {

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

  dropdownToggle = (e) => {
    e.stopPropagation();
    this.setState({ dropdownOpen: !this.state.dropdownOpen });
  };

  onMouseEnter = () => {
    this.setState({ active: true });
  };

  onMouseLeave = () => {
    if (this.state.dropdownOpen) return;
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
          <DingtalkDepartmentsTreeNode
            key={department.id}
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
    const { isChildrenShow, department, checkedDepartmentId } = this.props;
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
            <span className="tree-node-icon" onClick={(e) => this.toggleChildren(e)}>
              <Icon
                symbol="down"
                aria-hidden="true"
                className={classNames({ 'rotate-270': !this.state.isChildrenShow })}
              />
            </span>
            <span className="tree-node-text">{department.name}</span>
            {isPro &&
            <Dropdown
              isOpen={this.state.dropdownOpen}
              toggle={(e) => this.dropdownToggle(e)}
              direction="down"
              style={this.state.active ? {} : { opacity: 0 }}
            >
              <DropdownToggle
                tag='span'
                className='cursor-pointer right-icon'
                title={gettext('More operations')}
                aria-label={gettext('More operations')}
                data-toggle="dropdown"
                aria-expanded={this.state.dropdownOpen}
              >
                <Icon symbol="more-level" />
              </DropdownToggle>
              <DropdownMenu className="drop-list">
                <DropdownItem
                  onClick={this.importDepartmentDialogToggle.bind(this, department)}
                  id={department.id}
                >{'导入部门'}
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
            }
          </div>
        }
        {this.state.isChildrenShow &&
          <div className="department-children">
            {department.children ? this.renderTreeNodes(department.children) : <span className="ml-2 tip">{'(' + gettext('No sub-departments') + ')'}</span>}
          </div>
        }
      </Fragment>
    );
  }
}

DingtalkDepartmentsTreeNode.propTypes = DingtalkDepartmentsTreeNodePropTypes;

export default DingtalkDepartmentsTreeNode;
