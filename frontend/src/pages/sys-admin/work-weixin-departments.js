import React, { Component, Fragment } from 'react';
import { Button } from 'reactstrap';
import deepCopy from 'deep-copy';
import { seafileAPI } from '../../utils/seafile-api';
import { gettext, siteRoot, isPro } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import toaster from '../../components/toast';
import MainPanelTopbar from './main-panel-topbar';
import { WorkWeixinDepartmentMembersList, WorkWeixinDepartmentsTreePanel } from './work-weixin';
import ImportWorkWeixinDepartmentDialog from '../../components/dialog/import-work-weixin-department-dialog';

import '../../css/work-weixin-departments.css';

class WorkWeixinDepartments extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isTreeLoading: true,
      isMembersListLoading: true,
      departmentsTree: [],
      checkedDepartmentId: 0,
      membersTempObj: {},
      membersList: [],
      newUsersTempObj: {},
      isCheckedAll: false,
      canCheckUserIds: [],
      isImportDepartmentDialogShow: false,
      importDepartment: null,
      importDepartmentChildrenCount: 0,
      importDepartmentMembersCount: 0,
    };
  }

  getDepartmentsTree = (list) => {
    let childIds = [];
    let parentIds = [];
    for (let i = 0; i < list.length; i++) {
      if (childIds.indexOf(list[i].id) === -1) {
        childIds.push(list[i].id);
      }
      if (parentIds.indexOf(list[i].parentid) === -1) {
        parentIds.push(list[i].parentid);
      }
    }
    let intersection = parentIds.filter((v) => {
      return childIds.indexOf(v) !== -1;
    });
    let rootIds = parentIds.concat(intersection).filter((v) => {
      return parentIds.indexOf(v) === -1 || intersection.indexOf(v) === -1;
    });
    let cloneData = deepCopy(list);
    return cloneData.filter(father => {
      let branchArr = cloneData.filter(child => father.id === child.parentid);
      branchArr.length > 0 ? father.children = branchArr : '';
      return rootIds.indexOf(father.parentid) !== -1;
    });
  };

  getWorkWeixinDepartmentsList = (departmentID) => {
    seafileAPI.adminListWorkWeixinDepartments(departmentID).then((res) => {
      if (!departmentID) {
        let departmentsTree = this.getDepartmentsTree(res.data.department);
        this.setState({
          isTreeLoading: false,
          departmentsTree: departmentsTree,
        });
      } else {
        this.setState({
          importDepartmentChildrenCount: res.data.department.length,
          importDepartmentMembersCount: this.state.membersTempObj[departmentID].length,
        });
      }
    }).catch((error) => {
      this.handleError(error);
      this.setState({
        isTreeLoading: false,
        isMembersListLoading: false,
      });
      if (error.response && error.response.status === 403) {
        window.location = siteRoot + 'sys/useradmin/';
      }
    });
  };

  getWorkWeixinDepartmentMembersList = (department_id) => {
    this.setState({
      isMembersListLoading: true,
    });
    seafileAPI.adminListWorkWeixinDepartmentMembers(department_id, {fetch_child: true}).then((res) => {
      let membersTempObj = this.state.membersTempObj;
      membersTempObj[department_id] = res.data.userlist;
      let canCheckUserIds = this.getCanCheckUserIds(res.data.userlist);
      this.setState({
        membersTempObj: membersTempObj,
        membersList: res.data.userlist,
        isMembersListLoading: false,
        canCheckUserIds: canCheckUserIds,
      });
    }).catch((error) => {
      this.setState({isMembersListLoading: false});
      this.handleError(error);
    });
  };

  getCanCheckUserIds = (membersList) => {
    let userIds = [];
    membersList.forEach((member) => {
      if (!member.email) userIds.push(member.userid);
    });
    return userIds;
  };

  onChangeDepartment = (department_id) => {
    this.setState({
      newUsersTempObj: {},
      isCheckedAll: false,
      checkedDepartmentId: department_id,
    });
    if (!(department_id in this.state.membersTempObj)) {
      this.getWorkWeixinDepartmentMembersList(department_id);
    } else {
      let canCheckUserIds = this.getCanCheckUserIds(this.state.membersTempObj[department_id]);
      this.setState({
        membersList: this.state.membersTempObj[department_id],
        canCheckUserIds: canCheckUserIds,
      });
    }
  };

  onUserChecked = (user) => {
    if (this.state.canCheckUserIds.indexOf(user.userid) !== -1) {
      let newUsersTempObj = this.state.newUsersTempObj;
      if (user.userid in newUsersTempObj) {
        delete newUsersTempObj[user.userid];
        if (this.state.isCheckedAll) {
          this.setState({ isCheckedAll: false });
        }
      } else {
        newUsersTempObj[user.userid] = user;
        if (Object.keys(newUsersTempObj).length === this.state.canCheckUserIds.length) {
          this.setState({ isCheckedAll: true });
        }
      }
      this.setState({ newUsersTempObj: newUsersTempObj });
    }
  };

  onAllUsersChecked = () => {
    this.setState({
      isCheckedAll: !this.state.isCheckedAll,
    }, () => {
      if (this.state.isCheckedAll) {
        let newUsersTempObj = {};
        let newUsersTempList = this.state.membersList.filter(user => {
          return this.state.canCheckUserIds.indexOf(user.userid) !== -1;
        });
        for (let i = 0; i < newUsersTempList.length; i++) {
          newUsersTempObj[newUsersTempList[i].userid] = newUsersTempList[i];
        }
        this.setState({ newUsersTempObj: newUsersTempObj });
      } else {
        this.setState({ newUsersTempObj: {} });
      }
    });
  };

  onSubmit = () => {
    const { newUsersTempObj } = this.state;
    if (JSON.stringify(newUsersTempObj) === '{}') return;
    let userList = [];
    for (let i in newUsersTempObj) {
      userList.push(newUsersTempObj[i]);
    }
    if (userList.length === 0) {
      toaster.danger('未选择成员', {duration: 3});
      return;
    }
    seafileAPI.adminAddWorkWeixinUsersBatch(userList).then((res) => {
      this.setState({
        newUsersTempObj: {},
        isCheckedAll: false,
      });
      if (res.data.success) {
        this.handleSubmitSuccess(res.data.success);
      }
      if (res.data.failed) {
        const fails= res.data.failed;
        for (let i = 0; i < fails.length; i++) {
          toaster.danger(fails[i].name + ' ' + fails[i].error_msg, {duration: 3});
        }
      }
    }).catch((error) => {
      this.handleError(error);
    });

  };

  handleSubmitSuccess = (success) => {
    let { membersTempObj, membersList, canCheckUserIds } = this.state;
    for (let i = 0; i < success.length; i++) {
      let { userid, name, email } = success[i];
      toaster.success(name + ' 成功导入', {duration: 1});
      // refresh all temp
      if (canCheckUserIds.indexOf(userid) !== -1) {
        canCheckUserIds.splice(canCheckUserIds.indexOf(userid), 1);
      }
      for (let j = 0; j < membersList.length; j++) {
        if (membersList[j].userid === userid) {
          membersList[j].email = email;
          break;
        }
      }
      for (let departmentId in membersTempObj) {
        for (let k = 0; k < membersTempObj[departmentId].length; k++) {
          if (membersTempObj[departmentId][k].userid === userid) {
            membersTempObj[departmentId][k].email = email;
            break;
          }
        }
      }
    }
    this.setState({
      membersTempObj: membersTempObj,
      membersList: membersList,
      canCheckUserIds: canCheckUserIds,
    });
  }

  importDepartmentDialogToggle = (importDepartment) => {
    this.setState({
      isImportDepartmentDialogShow: !this.state.isImportDepartmentDialogShow,
      importDepartment: importDepartment,
    }, () => {
      if (importDepartment) {
        this.getWorkWeixinDepartmentsList(importDepartment.id);
      }
    });
  };

  onImportDepartmentSubmit = () => {
    let importDepartment = this.state.importDepartment;
    if (!importDepartment) return;
    seafileAPI.adminImportWorkWeixinDepartment(importDepartment.id).then((res) => {
      this.setState({
        isMembersListLoading: true,
        checkedDepartmentId: importDepartment.id,
        membersTempObj: {},
        membersList: [],
        newUsersTempObj: {},
        isCheckedAll: false,
        canCheckUserIds: [],
      });
      this.getWorkWeixinDepartmentMembersList(importDepartment.id);
      this.importDepartmentDialogToggle(null);
      if (res.data.success) {
        this.handleImportDepartmentSubmitSuccess(res.data.success);
      }
      if (res.data.failed) {
        this.handleImportDepartmentSubmitFailed(res.data.failed);
      }
    }).catch((error) => {
      this.handleError(error);
    });
  };

  handleImportDepartmentSubmitSuccess = (successes) => {
    for (let i = 0, len = successes.length; i < len; i++) {
      let success = successes[i];
      let successMsg = success.type === 'department' ? '部门 ' + success.department_name + ' 导入成功' : success.api_user_name + ' 导入成功' ;
      toaster.success(successMsg, { duration: 3 });
    }
  };

  handleImportDepartmentSubmitFailed = (fails) => {
    for (let i = 0, len = fails.length; i < len; i++) {
      let fail = fails[i];
      let failName = fail.type === 'department' ? fail.department_name : fail.api_user_name;
      toaster.danger(failName + ' ' + fail.msg, { duration: 3} );
    }
  };

  handleError = (error) => {
    const errorMsg = Utils.getErrorMsg(error);
    toaster.danger(errorMsg);
  }

  componentDidMount() {
    this.getWorkWeixinDepartmentsList(null);
  }

  render() {
    const { isImportDepartmentDialogShow, isTreeLoading, importDepartment, importDepartmentChildrenCount, importDepartmentMembersCount } = this.state;
    let canImportDepartment = !!(isPro && isImportDepartmentDialogShow && !isTreeLoading && importDepartment);
    return (
      <Fragment>
        <MainPanelTopbar {...this.props}>
          <Button className="operation-item" onClick={this.onSubmit}>{'导入用户'}</Button>
        </MainPanelTopbar>
        <div className="main-panel-center">
          <div className="cur-view-container">
            <div className="cur-view-path">
              <h3 className="sf-heading">{'企业微信集成'}</h3>
            </div>
            <div className="cur-view-content d-flex flex-row">
              <WorkWeixinDepartmentsTreePanel
                departmentsTree={this.state.departmentsTree}
                isTreeLoading={this.state.isTreeLoading}
                onChangeDepartment={this.onChangeDepartment}
                checkedDepartmentId={this.state.checkedDepartmentId}
                importDepartmentDialogToggle={this.importDepartmentDialogToggle}
              />
              <div className="dir-content-resize"></div>
              <WorkWeixinDepartmentMembersList
                isMembersListLoading={this.state.isMembersListLoading}
                membersList={this.state.membersList}
                checkedDepartmentId={this.state.checkedDepartmentId}
                newUsersTempObj={this.state.newUsersTempObj}
                onUserChecked={this.onUserChecked}
                onAllUsersChecked={this.onAllUsersChecked}
                isCheckedAll={this.state.isCheckedAll}
                canCheckUserIds={this.state.canCheckUserIds}
              />
            </div>
          </div>
        </div>
        {canImportDepartment &&
          <ImportWorkWeixinDepartmentDialog
            importDepartmentDialogToggle={this.importDepartmentDialogToggle}
            onImportDepartmentSubmit={this.onImportDepartmentSubmit}
            departmentsCount={importDepartmentChildrenCount}
            membersCount={importDepartmentMembersCount}
            departmentName={importDepartment.name}
          />
        }
      </Fragment>
    );
  }
}

export default WorkWeixinDepartments;
