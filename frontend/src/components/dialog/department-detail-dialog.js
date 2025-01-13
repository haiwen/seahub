import React, { Fragment, } from 'react';
import PropTypes from 'prop-types';
import { gettext, isOrgContext, username } from '../../utils/constants';
import { Modal, ModalBody, ModalHeader } from 'reactstrap';
import { seafileAPI } from '../../utils/seafile-api.js';
import { Utils } from '../../utils/utils';
import toaster from '../../components/toast';
import EmptyTip from '../../components/empty-tip';
import Loading from '../../components/loading';
import Department from '../../models/department';
import DepartmentGroup from './department-detail-widget/department-group';
import DepartmentGroupMembers from './department-detail-widget/department-group-members';
import DepartmentGroupMemberSelected from './department-detail-widget/department-group-member-selected';
import '../../css/manage-members-dialog.css';
import '../../css/group-departments.css';

const propTypes = {
  groupID: PropTypes.number,
  toggleManageMembersDialog: PropTypes.func,
  toggleDepartmentDetailDialog: PropTypes.func,
  isOwner: PropTypes.bool,
  isAdmin: PropTypes.bool,
  loadWorkspaceList: PropTypes.func,
  addUserShares: PropTypes.func,
  usedFor: PropTypes.oneOf(['add_group_member', 'add_user_share']),
  userList: PropTypes.array,
};

class DepartmentDetailDialog extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      departments: [],
      departmentMembers: [],
      newMembersTempObj: {},
      currentDepartment:  {},
      departmentsLoading: true,
      membersLoading: true,
      selectedMemberMap: {},
      departmentsTree: [],
      currentMemberPage: 1,
      hasMore: true,
    };
  }

  componentDidMount() {
    this.getSelectedMembers();
    this.getDepartmentsList();
  }

  getSelectedMembers = () => {
    const { usedFor, userList, groupID } = this.props;
    if (usedFor === 'add_user_share') {
      let selectedMemberMap = {};
      selectedMemberMap[username] = true;
      userList.forEach(member => {
        selectedMemberMap[member.email] = true;
      });
      this.setState({ selectedMemberMap });
    }
    else if (usedFor === 'add_group_member') {
      seafileAPI.listGroupMembers(groupID).then((res) => {
        const groupMembers = res.data;
        let selectedMemberMap = {};
        selectedMemberMap[username] = true;
        groupMembers.forEach(member => {
          selectedMemberMap[member.email] = true;
        });
        this.setState({ selectedMemberMap });
      }).catch(error => {
        this.onError(error);
      });
    }
  }

  onError = (error) => {
    let errMsg = Utils.getErrorMsg(error, true);
    if (!error.response || error.response.status !== 403) {
      toaster.danger(errMsg);
    }
  }
  
  initDepartments(departments) {
    const parentIdMap = {};
    for (let i = 0; i < departments.length; i++) {
      let item = departments[i];
      parentIdMap[item.parent_group_id] = true;
    }
    return departments.map(depart => {
      depart.hasChild = !!parentIdMap[depart.id];
      depart.isExpanded = false;
      return depart;
    });
  }

  getDepartmentsList = () => {
    seafileAPI.listAddressBookDepartments().then((res) => {
      let departments = res.data.departments.map(item => {
        return new Department(item);
      });
      let currentDepartment = departments.length > 0 ? departments[0] : {};
      let departmentsTree = this.initDepartments(departments);
      this.setState({
        departments: departments,
        currentDepartment: currentDepartment,
        departmentsLoading:false,
        departmentsTree: departmentsTree
      });
      if (isOrgContext) {
        this.getOrgMembers();
      } else if (Object.keys(currentDepartment).length > 0) {
        this.getMembers(currentDepartment.id);
      }
    }).catch(error => {
      this.onError(error);
    });
  };

  getMembers = (department_id) => {
    this.setState({ membersLoading: true });
    seafileAPI.listAddressBookDepartmentMembers(department_id).then((res) => {
      this.setState({
        departmentMembers: res.data.members,
        membersLoading: false,
      });
    }).catch(error => {
      this.onError(error);
    });
  }

  resetCurrentPage = () => {
    this.setState({ currentMemberPage: 1, hasMore: true });
  }

  getOrgMembers = async () => {
    const orgID = window.app.pageOptions.orgID;
    await this.resetCurrentPage();
    this.setState({ membersLoading: true });
    let currentMemberPage = this.state.currentMemberPage;
    seafileAPI.getOrganizationMembers(orgID, currentMemberPage).then((res) => {
      this.setState({
        departmentMembers: res.data.members,
        membersLoading: false,
        currentMemberPage: currentMemberPage + 1,
        currentDepartment: {
          'name': gettext('All users'),
          'id': -1
        }
      });
    }).catch(error => {
      let errMsg = Utils.getErrorMsg(error, true);
      if (!error.response || error.response.status !== 403) {
        toaster.danger(errMsg);
      }
    });
  }

   getMoreOrgMembers = async () => {
     const orgID = window.app.pageOptions.orgID;
     let currentMemberPage = this.state.currentMemberPage;
     seafileAPI.getOrganizationMembers(orgID, currentMemberPage).then((res) => {
       let members = res.data.members;
       this.setState({
         departmentMembers: [...this.state.departmentMembers, ...members],
         currentMemberPage: currentMemberPage + 1,
         hasMore: members.length >= 20
       });
     }).catch(error => {
       this.setState({
         errorMsg: Utils.getErrorMsg(error),
       });
     });
   }

  toggle = () => {
    this.props.toggleDepartmentDetailDialog();
  }

  onMemberChecked = (member) => {
    if (this.state.departmentMembers.indexOf(member) !== -1) {
      let newMembersTempObj = this.state.newMembersTempObj;
      if (member.email in newMembersTempObj) {
        delete newMembersTempObj[member.email];
      } else {
        newMembersTempObj[member.email] = member;
      }
      this.setState({ newMembersTempObj: newMembersTempObj });
    }
  };

  addGroupMember = () => {
    let emails = Object.keys(this.state.newMembersTempObj);
    seafileAPI.addGroupMembers(this.props.groupID, emails).then((res) => {
      this.props.loadWorkspaceList();
      this.toggle();
      this.props.toggleManageMembersDialog();
    }).catch(error => {
      this.onError(error);
    });
  }

  addUserShares = () => {
    this.props.addUserShares(this.state.newMembersTempObj);
  }

  removeSelectedMember = (email) => {
    let newMembersTempObj = this.state.newMembersTempObj;
    delete newMembersTempObj[email];
    this.setState({ newMembersTempObj: newMembersTempObj });
  }

  setCurrent = (department) => {
    this.setState({ currentDepartment: department });
  }

  selectAll = (members) => {
    let { newMembersTempObj, selectedMemberMap } = this.state;
    for (let member of members) {
      if (Object.keys(selectedMemberMap).indexOf(member.email) !== -1) {
        continue;
      }
      newMembersTempObj[member.email] = member;
    }
    this.setState({ newMembersTempObj: newMembersTempObj });
  }

  renderHeader = () => {
    const title = this.props.usedFor === 'add_group_member' ? gettext('Select group members') : gettext('Select shared users');
    return <ModalHeader toggle={this.toggle}>{title}</ModalHeader>;
  }

  render() {
    let { departmentsLoading, departments } = this.state;
    if (departmentsLoading) {
      return (
        <Modal isOpen={true} toggle={this.toggle}>
          {this.renderHeader()}
          <ModalBody>
            <div className="d-flex flex-fill align-items-center"><Loading /></div>
          </ModalBody>
        </Modal>
      );
    }

    const emptyTips = (
      <Modal isOpen={true} toggle={this.toggle}>
        {this.renderHeader()}
        <ModalBody>
          <EmptyTip>
            <h2>{gettext('No departments')}</h2>
          </EmptyTip>
        </ModalBody>
      </Modal>
    );

    const details = (
      <Modal isOpen={true} toggle={this.toggle} className="department-dialog" style={{maxWidth: '900px'}}>
        {this.renderHeader()}
        <ModalBody className="department-dialog-content">
          <DepartmentGroup
            departments={this.state.departments}
            getMembers={this.getMembers}
            setCurrent={this.setCurrent}
            currentDepartment={this.state.currentDepartment}
            loading={this.state.departmentsLoading}
            getOrgMembers={this.getOrgMembers}
            departmentsTree={this.state.departmentsTree}
          />
          <DepartmentGroupMembers
            members={this.state.departmentMembers}
            memberSelected={this.state.newMembersTempObj}
            onUserChecked={this.onMemberChecked}
            currentDepartment={this.state.currentDepartment}
            selectAll={this.selectAll}
            loading={this.state.membersLoading}
            selectedMemberMap={this.state.selectedMemberMap}
            hasMore={this.state.hasMore}
            isLoadingMore={this.state.isLoadingMore}
            getMoreOrgMembers={this.getMoreOrgMembers}
            usedFor={this.props.usedFor}
          />
          <DepartmentGroupMemberSelected
            members={this.state.newMembersTempObj}
            removeSelectedMember={this.removeSelectedMember}
            addGroupMember={this.addGroupMember}
            toggle={this.toggle}
            addUserShares={this.addUserShares}
            usedFor={this.props.usedFor}
          />
        </ModalBody>
      </Modal>
    );
    return (
      <Fragment>
        {(departments.length > 0 || isOrgContext) ? details : emptyTips}
      </Fragment>
    );
  }
}

DepartmentDetailDialog.propTypes = propTypes;

export default DepartmentDetailDialog;
