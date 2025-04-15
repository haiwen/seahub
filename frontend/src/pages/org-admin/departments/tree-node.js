import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { Dropdown, DropdownToggle } from 'reactstrap';
import { gettext } from '../../../utils/constants';
import DepartmentNodeMenu from './departments-node-dropdown-menu';

const departmentsV2TreeNodePropTypes = {
  node: PropTypes.object,
  checkedDepartmentId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  listSubDepartments: PropTypes.func,
  onChangeDepartment: PropTypes.func,
  toggleAddDepartment: PropTypes.func,
  toggleSetQuotaDialog: PropTypes.func,
  toggleAddLibrary: PropTypes.func,
  toggleAddMembers: PropTypes.func,
  toggleRename: PropTypes.func,
  toggleDelete: PropTypes.func
};

class DepartmentsV2TreeNode extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isShowTreeIcon: true,
      isChildrenShow: false,
      dropdownOpen: false,
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
      if (Array.isArray(childrenNodes) && childrenNodes.length === 0) {
        this.setState({ isShowTreeIcon: false });
      }
      this.setState({ isChildrenShow: true });
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

  renderTreeNodes = (nodes) => {
    if (nodes.length > 0) {
      return nodes.map((node) => {
        return (
          <DepartmentsV2TreeNode
            key={node.id}
            node={node}
            onChangeDepartment={this.props.onChangeDepartment}
            checkedDepartmentId={this.props.checkedDepartmentId}
            listSubDepartments={this.props.listSubDepartments}
            toggleAddDepartment={this.props.toggleAddDepartment}
            toggleAddMembers={this.props.toggleAddMembers}
            toggleRename={this.props.toggleRename}
            toggleDelete={this.props.toggleDelete}
            toggleAddLibrary={this.props.toggleAddLibrary}
            toggleSetQuotaDialog={this.props.toggleSetQuotaDialog}
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
    const { isChildrenShow, dropdownOpen, active } = this.state;
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
          {this.state.isShowTreeIcon ?
            <span className="departments-v2-tree-icon" onClick={(e) => this.toggleChildren(e)}>
              <i className={`sf3-font sf3-font-down ${isChildrenShow ? '' : 'rotate-270'}`}></i>
            </span>
            :
            <span style={{ width: 24 }}></span>
          }
          <span className="departments-v2-tree-node-text text-truncate">{node.name}</span>
          {active &&
            <Dropdown
              isOpen={dropdownOpen}
              toggle={(e) => this.dropdownToggle(e)}
              direction="down"
              className="mr-2"
            >
              <DropdownToggle
                tag='span'
                role="button"
                className='right-icon'
                title={gettext('More operations')}
                aria-label={gettext('More operations')}
                data-toggle="dropdown"
              >
                <i className="sf3-font sf3-font-more"></i>
              </DropdownToggle>
              <DepartmentNodeMenu
                node={node}
                toggleAddDepartment={this.props.toggleAddDepartment}
                toggleAddLibrary={this.props.toggleAddLibrary}
                toggleAddMembers={this.props.toggleAddMembers}
                toggleSetQuotaDialog={this.props.toggleSetQuotaDialog}
                toggleRename={this.props.toggleRename}
                toggleDelete={this.props.toggleDelete}
              />
            </Dropdown>
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

DepartmentsV2TreeNode.propTypes = departmentsV2TreeNodePropTypes;

export default DepartmentsV2TreeNode;
