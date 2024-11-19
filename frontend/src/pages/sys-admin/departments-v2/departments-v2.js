import React, { Fragment } from 'react';
import { Button } from 'reactstrap';
import toaster from '../../../components/toast';
import { gettext } from '../../../utils/constants';
import Account from '../../../components/common/account';
import DepartmentNode from './department-node';
import DepartmentV2TreePanel from './departments-v2-tree-panel';
import { systemAdminAPI } from '../../../utils/system-admin-api';
import DepartmentsV2MembersList from './departments-v2-members-list';
import AddDepartmentV2Dialog from '../../../components/dialog/sysadmin-dialog/add-department-v2-dialog';
import AddDepartMemberV2Dialog from '../../../components/dialog/sysadmin-dialog/sysadmin-add-depart-member-v2-dialog';
import RenameDepartmentV2Dialog from '../../../components/dialog/sysadmin-dialog/rename-department-v2-dialog';
import DeleteDepartmentV2ConfirmDialog from '../../../components/dialog/sysadmin-dialog/delete-department-v2-confirm-dialog';
import AddRepoDialog from '../../../components/dialog/sysadmin-dialog/sysadmin-add-repo-dialog';
import Loading from '../../../components/loading';
import { Utils } from '../../../utils/utils';

import '../../../css/system-departments-v2.css';

class DepartmentsV2 extends React.Component {

  constructor(props) {
    super(props);
    const localSortItems = localStorage.getItem('departments-members-sort-items') || {};
    this.state = {
      rootNodes: [],
      checkedDepartmentId: -1,
      operateNode: null,
      isAddDepartmentDialogShow: false,
      isAddMembersDialogShow: false,
      isRenameDepartmentDialogShow: false,
      isDeleteDepartmentDialogShow: false,
      isShowAddRepoDialog: false,
      membersList: [],
      isTopDepartmentLoading: false,
      isMembersListLoading: false,
      sortBy: localSortItems.sort_by || 'name', // 'name' or 'role'
      sortOrder: localSortItems.sort_order || 'asc', // 'asc' or 'desc',
    };
  }

  componentDidMount() {
    this.setState({ isTopDepartmentLoading: true }, () => {
      systemAdminAPI.sysAdminListAllDepartments().then(res => {
        const department_list = res.data.data;
        if (department_list && department_list.length > 0) {
          const rootNodes = department_list.map(item => {
            const node = new DepartmentNode({
              id: item.id,
              name: item.name,
              orgId: item.org_id,
            });
            return node;
          });
          this.setState({
            rootNodes,
            checkedDepartmentId: rootNodes[0].id,
          });
          this.loadDepartmentMembers(rootNodes[0].id);
        }
        this.setState({ isTopDepartmentLoading: false });
      });
    });
  }

  onChangeDepartment = (nodeId) => {
    this.setState({ checkedDepartmentId: nodeId }, this.loadDepartmentMembers(nodeId));
  };

  loadDepartmentMembers = (nodeId) => {
    if (nodeId === -1) {
      this.setState({
        isMembersListLoading: false,
        membersList: [],
      });
      return;
    }
    this.setState({ isMembersListLoading: true });
    systemAdminAPI.sysAdminListGroupMembers(nodeId, 0, 100).then(res => {
      this.setState({
        membersList: res.data.members,
        isMembersListLoading: false
      });
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  listSubDepartments = (nodeId, cb) => {
    const { rootNodes } = this.state;
    let node = null;
    rootNodes.forEach(rootNode => {
      if (!node) {
        node = rootNode.findNodeById(nodeId);
      }
    });
    if (!node) return;
    systemAdminAPI.sysAdminGetDepartmentInfo(nodeId).then(res => {
      const childrenNodes = res.data.groups.map(department => new DepartmentNode({
        id: department.id,
        name: department.name,
        parentGroupId: department.parent_group_id,
        orgId: department.org_id,
        parentNode: node,
      }));
      node.setChildren(childrenNodes);
      cb && cb(childrenNodes);
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  getRepos = (nodeId, cb) => {
    systemAdminAPI.sysAdminListGroupRepos(nodeId).then(res => {
      cb && cb(res.data.libraries);
    }).catch(error => {
      if (error.response && error.response.status === 404) {
        cb && cb(null);
        return;
      }
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  toggleAddLibrary = (node) => {
    this.setState({
      operateNode: node,
      isShowAddRepoDialog: !this.state.isShowAddRepoDialog
    });
  };

  toggleAddDepartment = (node) => {
    this.setState({ operateNode: node, isAddDepartmentDialogShow: !this.state.isAddDepartmentDialogShow });
  };

  toggleAddMembers = (node) => {
    this.setState({ operateNode: node, isAddMembersDialogShow: !this.state.isAddMembersDialogShow });
  };

  toggleRename = (node) => {
    this.setState({ operateNode: node, isRenameDepartmentDialogShow: !this.state.isRenameDepartmentDialogShow });
  };

  toggleDelete = (node) => {
    this.setState({ operateNode: node, isDeleteDepartmentDialogShow: !this.state.isDeleteDepartmentDialogShow });
  };

  addDepartment = (parentNode, department) => {
    parentNode.addChildren([new DepartmentNode({
      id: department.id,
      name: department.name,
      parentNode: parentNode,
      orgId: department.org_id,
    })]);
  };

  setRootNode = (department) => {
    const newRootNode = new DepartmentNode({
      id: department.id,
      name: department.name,
      orgId: department.org_id,
    });
    const rootNodes = this.state.rootNodes.slice(0);
    rootNodes.push(newRootNode);
    this.setState({
      rootNodes: rootNodes,
      checkedDepartmentId: newRootNode.id,
    });
    this.loadDepartmentMembers(newRootNode.id);
  };

  renameDepartment = (node, department) => {
    node.id = department.id;
    node.name = department.name;
  };

  onDelete = () => {
    const { operateNode, checkedDepartmentId } = this.state;
    systemAdminAPI.sysAdminDeleteDepartment(operateNode.id).then(() => {
      this.toggleDelete();
      if (operateNode.parentNode) {
        operateNode.parentNode.deleteChildById(operateNode.id);
        if (operateNode.id === checkedDepartmentId && operateNode.parentNode.id !== -1) {
          this.onChangeDepartment(operateNode.parentNode.id);
        }
      } else {
        let rootNodes = this.state.rootNodes.slice(0);
        let rootIndex = rootNodes.findIndex(node => node.id === operateNode.id);
        rootNodes.splice(rootIndex, 1);
        this.setState({
          rootNodes,
          checkedDepartmentId: rootNodes[0].id,
        });
        this.loadDepartmentMembers(rootNodes[0].id);
      }
    }).catch(error => {
      if (error.response && error.response.status === 400) {
        toaster.danger(error.response.data.error_msg);
        return;
      }
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  onMemberChanged = () => {
    const { checkedDepartmentId, operateNode } = this.state;
    if (checkedDepartmentId && operateNode && checkedDepartmentId !== operateNode.id) return;
    this.loadDepartmentMembers(operateNode.id);
  };

  setMemberStaff = (email, isAdmin) => {
    const { checkedDepartmentId, membersList } = this.state;
    systemAdminAPI.sysAdminUpdateGroupMemberRole(checkedDepartmentId, email, isAdmin).then(res => {
      const member = res.data;
      const newMembersList = membersList.map(memberItem => {
        if (memberItem.email === email) return member;
        return memberItem;
      });
      this.setState({ membersList: newMembersList });
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  deleteMember = (email) => {
    const { checkedDepartmentId, membersList } = this.state;
    systemAdminAPI.sysAdminDeleteGroupMember(checkedDepartmentId, email).then(() => {
      const newMembersList = membersList.filter(memberItem => memberItem.email !== email);
      this.setState({ membersList: newMembersList });
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  sortMembers = (items, sortBy, sortOrder) => {
    let comparator;
    switch (`${sortBy}-${sortOrder}`) {
      case 'name-asc':
        comparator = function (a, b) {
          var result = Utils.compareTwoWord(a.name, b.name);
          return result;
        };
        break;
      case 'name-desc':
        comparator = function (a, b) {
          var result = Utils.compareTwoWord(a.name, b.name);
          return -result;
        };
        break;
      case 'role-asc':
        comparator = function (a, b) {
          return a.is_staff && !b.is_staff ? -1 : 1;
        };
        break;
      case 'role-desc':
        comparator = function (a, b) {
          return a.is_staff && !b.is_staff ? 1 : -1;
        };
        break;
      default:
        comparator = function () {
          return true;
        };
    }
    items.sort((a, b) => {
      return comparator(a, b);
    });
    return items;
  };

  sortItems = (sortBy, sortOrder) => {
    localStorage.setItem('departments-members-sort-items', { sort_by: sortBy, sort_order: sortOrder });
    this.setState({
      sortBy: sortBy,
      sortOrder: sortOrder,
      membersList: this.sortMembers(this.state.membersList, sortBy, sortOrder),
    });
  };


  render() {
    const { rootNodes, operateNode, checkedDepartmentId, isAddDepartmentDialogShow, isAddMembersDialogShow,
      membersList, isMembersListLoading, isTopDepartmentLoading, isRenameDepartmentDialogShow,
      isDeleteDepartmentDialogShow, sortBy, sortOrder } = this.state;
    return (
      <Fragment>

        <div className="main-panel-north border-left-show">
          <div className="cur-view-toolbar">
            <span className="sf2-icon-menu side-nav-toggle hidden-md-up d-md-none" title="Side Nav Menu"></span>
            <div className="operation">
              <button className='btn btn-secondary operation-item' title={gettext('New Department')} onClick={() => {this.toggleAddDepartment(null);}}>{gettext('New Department')}
              </button>
            </div>
          </div>
          <div className="common-toolbar">
            <Account isAdminPanel={true}/>
          </div>
        </div>

        <div className="main-panel-center">
          <div className="cur-view-container">
            <h2 className="heading">{gettext('Departments')}</h2>
            <div className="cur-view-content d-flex flex-row p-0">
              {isTopDepartmentLoading && <Loading/>}
              {(!isTopDepartmentLoading && rootNodes.length > 0) &&
                <>
                  <DepartmentV2TreePanel
                    rootNodes={rootNodes}
                    checkedDepartmentId={checkedDepartmentId}
                    onChangeDepartment={this.onChangeDepartment}
                    listSubDepartments={this.listSubDepartments}
                    toggleAddDepartment={this.toggleAddDepartment}
                    toggleAddLibrary={this.toggleAddLibrary}
                    toggleAddMembers={this.toggleAddMembers}
                    toggleRename={this.toggleRename}
                    toggleDelete={this.toggleDelete}
                  />
                  <DepartmentsV2MembersList
                    rootNodes={rootNodes}
                    checkedDepartmentId={checkedDepartmentId}
                    membersList={membersList}
                    isMembersListLoading={isMembersListLoading}
                    isAddNewRepo={this.state.isAddNewRepo}
                    setMemberStaff={this.setMemberStaff}
                    deleteMember={this.deleteMember}
                    sortItems={this.sortItems}
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    getRepos={this.getRepos}
                    deleteGroup={this.deleteGroup}
                    createGroup={this.createGroup}
                    toggleAddDepartment={this.toggleAddDepartment}
                    toggleAddLibrary={this.toggleAddLibrary}
                    toggleAddMembers={this.toggleAddMembers}
                    toggleRename={this.toggleRename}
                    toggleDelete={this.toggleDelete}
                  />
                </>
              }
              {(!isTopDepartmentLoading && rootNodes.length === 0) &&
                <div className="top-department-button-container h-100 w-100">
                  <Button onClick={this.toggleAddDepartment.bind(this, null)}>
                    {gettext('Enable departments feature')}
                  </Button>
                </div>
              }
            </div>
          </div>
        </div>
        {isAddMembersDialogShow &&
          <AddDepartMemberV2Dialog
            toggle={this.toggleAddMembers}
            nodeId={operateNode.id}
            onMemberChanged={this.onMemberChanged}
          />
        }
        {isRenameDepartmentDialogShow &&
          <RenameDepartmentV2Dialog
            node={operateNode}
            toggle={this.toggleRename}
            renameDepartment={this.renameDepartment}
          />
        }
        {isDeleteDepartmentDialogShow &&
          <DeleteDepartmentV2ConfirmDialog
            node={operateNode}
            toggle={this.toggleDelete}
            onDelete={this.onDelete}
          />
        }
        {isAddDepartmentDialogShow &&
          <AddDepartmentV2Dialog
            parentNode={operateNode}
            toggle={this.toggleAddDepartment}
            addDepartment={this.addDepartment}
            setRootNode={this.setRootNode}
          />
        }
        {this.state.isShowAddRepoDialog && (
          <AddRepoDialog
            toggle={this.toggleAddLibrary}
            onAddNewRepo={() => {this.setState({ isAddNewRepo: !this.state.isAddNewRepo });}}
            groupID={String(operateNode.id)}
          />
        )}
      </Fragment>
    );
  }

}

export default DepartmentsV2;
