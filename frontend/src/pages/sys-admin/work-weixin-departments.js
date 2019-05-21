import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {seafileAPI} from '../../utils/seafile-api';
import {gettext, siteRoot} from '../../utils/constants';
import toaster from '../../components/toast';
import Loading from '../../components/loading';
import {Button, Table} from 'reactstrap';


class WorkWeixinDepartmentMembersList extends Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  render() {
    const membersList = this.props.membersList.map((member, index) => {
      let avatar = member.avatar;
      if (member.avatar.length > 0) {
        // get smaller avatar
        avatar = member.avatar.substring(0, member.avatar.length - 1) + '100';
      } else {
        avatar = siteRoot + 'media/avatars/default.png';
      }
      const checkbox = member.exists ? '' :
        <input
          type="checkbox"
          className="vam"
          checked={(member.userid in this.props.newUsersTempObj) ? 'checked' : ''}
          onChange={() => this.props.handlerUser(member)}
        ></input>;
      return (
        <tr key={this.props.checkedDepartmentId.toString() + member.userid}>
          <td>{checkbox}</td>
          <td><img className="avatar" src={avatar}></img></td>
          <td>{member.name}</td>
          <td>{member.mobile}</td>
          <td>{member.email}</td>
          <td>{member.exists ? <i className="sf2-icon-tick"></i> : ''}</td>
        </tr>
      );
    });

    const allCheckBox = !this.props.canCheckUserIds.length ? '' :
      <input
        type="checkbox"
        className="vam"
        checked={this.props.isCheckedAll}
        onChange={() => this.props.handlerAllUsers()}
      ></input>;

    return (
      <div className="dir-content-main" style={{width: '75%'}}>
        <div className="table-container ">
          {this.props.isMembersListLoading && <Loading/>}

          {!this.props.isMembersListLoading &&
          <Table hover>
            <thead>
              <tr>
                <th width="36px">{allCheckBox}</th>
                <th width="56px"></th>
                <th width="">{'名称'}</th>
                <th width="">{'手机号'}</th>
                <th width="">{'邮箱'}</th>
                <th width="66px">{'已添加'}</th>
              </tr>
            </thead>
            <tbody>
              {membersList}
            </tbody>
          </Table>
          }
          {!this.props.isMembersListLoading && this.props.membersList.length === 0 &&
          <div className="message empty-tip">
            <h2>{gettext('无成员')}</h2>
          </div>
          }
        </div>
      </div>
    );
  }
}

const WorkWeixinDepartmentMembersListPropTypes = {
  isMembersListLoading: PropTypes.bool.isRequired,
  membersList: PropTypes.array.isRequired,
  newUsersTempObj: PropTypes.object.isRequired,
  checkedDepartmentId: PropTypes.number.isRequired,
  handlerUser: PropTypes.func.isRequired,
  handlerAllUsers: PropTypes.func.isRequired,
  isCheckedAll: PropTypes.bool.isRequired,
  canCheckUserIds: PropTypes.array.isRequired,
};

WorkWeixinDepartmentMembersList.propTypes = WorkWeixinDepartmentMembersListPropTypes;


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

  componentDidMount() {
    if (this.props.index === 0) {
      this.toggleChildren();
      this.props.onChangeDepartment(this.props.department.id);
    }
  }

  render() {
    let toggleIconClass = '';
    if (this.props.department.children) {
      if (this.state.isChildrenShow) {
        toggleIconClass = 'folder-toggle-icon fa fa-caret-down';
      } else {
        toggleIconClass = 'folder-toggle-icon fa fa-caret-right';
      }
    }
    let departmentStyle = this.props.checkedDepartmentId === this.props.department.id ? {color: 'blue'} : {};

    return (
      <div>
        {this.props.isChildrenShow &&
        <div>
          <i className={toggleIconClass} onClick={() => this.toggleChildren()}></i>{' '}
          <i
            style={departmentStyle}
            onClick={() => this.props.onChangeDepartment(this.props.department.id)}
          >{this.props.department.name}</i>
        </div>
        }
        {this.state.isChildrenShow &&
        <div style={{left: '30px', position: 'relative'}}>
          {this.props.department.children && this.renderTreeNodes(this.props.department.children)}
        </div>
        }
      </div>
    );
  }
}

const WorkWeixinDepartmentsTreeNodePropTypes = {
  index: PropTypes.number,
  department: PropTypes.object.isRequired,
  isChildrenShow: PropTypes.bool.isRequired,
  onChangeDepartment: PropTypes.func.isRequired,
  checkedDepartmentId: PropTypes.number.isRequired,
};

WorkWeixinDepartmentsTreeNode.propTypes = WorkWeixinDepartmentsTreeNodePropTypes;


class WorkWeixinDepartmentsTreePanel extends Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  render() {
    const departmentsTree = this.props.departmentsTree.map((department, index) => {
      return (
        <WorkWeixinDepartmentsTreeNode
          key={department.id}
          index={index}
          department={department}
          isChildrenShow={true}
          onChangeDepartment={this.props.onChangeDepartment}
          checkedDepartmentId={this.props.checkedDepartmentId}
        />
      );
    });

    return (
      <div className="dir-content-nav" style={{width: '25%'}}>
        <div className="tree-view tree">
          {this.props.isTreeLoading && <Loading/>}
          {!this.props.isTreeLoading &&
          <div className="tree-node">
            {this.props.departmentsTree.length > 0 && departmentsTree}
          </div>
          }
        </div>
      </div>
    );
  }
}

const WorkWeixinDepartmentsTreePanelPropTypes = {
  isTreeLoading: PropTypes.bool.isRequired,
  departmentsTree: PropTypes.array.isRequired,
  onChangeDepartment: PropTypes.func.isRequired,
  checkedDepartmentId: PropTypes.number.isRequired,
};

WorkWeixinDepartmentsTreePanel.propTypes = WorkWeixinDepartmentsTreePanelPropTypes;


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

    let cloneData = JSON.parse(JSON.stringify(list));
    return cloneData.filter(father => {
      let branchArr = cloneData.filter(child => father.id === child.parentid);
      branchArr.length > 0 ? father.children = branchArr : '';
      return rootIds.indexOf(father.parentid) !== -1;
    });
  };

  getWorkWeixinDepartmentsList = () => {
    seafileAPI.listWorkWeixinDepartments().then((res) => {
      let departmentsTree = this.getDepartmentsTree(res.data.department);
      this.setState({
        isTreeLoading: false,
        departmentsTree: departmentsTree,
      });
    }).catch((error) => {
      this.setState({
        isTreeLoading: false,
        isMembersListLoading: false,
      });
      if (error.response) {
        toaster.danger(error.response.data.error_msg || error.response.data.detail || gettext('Error'), {duration: 3});
      } else {
        toaster.danger(gettext('Please check the network.'), {duration: 3});
      }
    });
  };

  getWorkWeixinDepartmentMembersList = (department_id) => {
    this.setState({
      isMembersListLoading: true,
    });
    seafileAPI.listWorkWeixinDepartmentMembers(department_id.toString(), {fetch_child: 1}).then((res) => {
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
      if (error.response) {
        toaster.danger(error.response.data.error_msg || error.response.data.detail || gettext('Error'), {duration: 3});
      } else {
        toaster.danger(gettext('Please check the network.'), {duration: 3});
      }
    });
  };

  getCanCheckUserIds = (membersList) => {
    let canCheckUserIds = [];
    for (let i = 0; i < membersList.length; i++) {
      let user = membersList[i];
      if (!user.exists) {
        canCheckUserIds.push(user.userid);
      }
    }
    return canCheckUserIds;
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

  handlerUser = (user) => {
    if (this.state.canCheckUserIds.indexOf(user.userid) !== -1) {
      let newUsersTempObj = this.state.newUsersTempObj;
      if (user.userid in newUsersTempObj) {
        delete newUsersTempObj[user.userid];
        if (this.state.isCheckedAll) {
          this.setState({
            isCheckedAll: false,
          });
        }
      } else {
        newUsersTempObj[user.userid] = user;
        if (Object.keys(newUsersTempObj).length === this.state.canCheckUserIds.length) {
          this.setState({
            isCheckedAll: true,
          });
        }
      }
      this.setState({
        newUsersTempObj: newUsersTempObj,
      });
    }
  };

  handlerAllUsers = () => {
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
        this.setState({
          newUsersTempObj: newUsersTempObj,
        });
      } else {
        this.setState({
          newUsersTempObj: {},
        });
      }
    });
  };

  handlerSubmit = () => {
    let userList = [];
    for (let i in this.state.newUsersTempObj) {
      userList.push(this.state.newUsersTempObj[i]);
    }
    if (!userList.length) {
      toaster.danger('未选择成员', {duration: 3});
    } else {
      seafileAPI.adminAddWorkWeixinUsers(userList).then((res) => {
        this.setState({
          newUsersTempObj: {},
          isCheckedAll: false,
        });
        if (res.data.success) {
          let membersTempObj = this.state.membersTempObj;
          let membersList = this.state.membersList;
          let canCheckUserIds = this.state.canCheckUserIds;
          for (let i = 0; i < res.data.success.length; i++) {
            let userid = res.data.success[i].userid;
            let name = res.data.success[i].name;
            toaster.success(name + ' 成功导入', {duration: 1});
            // refresh all temp
            if (canCheckUserIds.indexOf(userid) !== -1) {
              canCheckUserIds.splice(canCheckUserIds.indexOf(userid), 1);
            }
            for (let j = 0; j < membersList.length; j++) {
              if (membersList[j].userid === userid) {
                membersList[j].exists = true;
                break;
              }
            }
            for (let departmentId in membersTempObj) {
              for (let k = 0; k < membersTempObj[departmentId].length; k++) {
                if (membersTempObj[departmentId][k].userid === userid) {
                  membersTempObj[departmentId][k].exists = true;
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
        if (res.data.failed) {
          for (let i = 0; i < res.data.failed.length; i++) {
            let name = res.data.failed[i].name;
            let errorMsg = res.data.failed[i].error_msg;
            toaster.danger(name + ' ' + errorMsg, {duration: 3});
          }
        }
      }).catch((error) => {
        if (error.response) {
          toaster.danger(error.response.data.error_msg || error.response.data.detail || gettext('Error'), {duration: 3});
        } else {
          toaster.danger(gettext('Please check the network.'), {duration: 3});
        }
      });
    }

  };

  componentDidMount() {
    this.getWorkWeixinDepartmentsList();
  }

  render() {
    return (
      <div className="main-panel-center">
        <div className="cur-view-container">
          <div className="cur-view-path">
            <h3 className="sf-heading">{'企业微信组织架构'}</h3>
            {JSON.stringify(this.state.newUsersTempObj) !== '{}' &&
            <Button className="btn btn-secondary operation-item" onClick={this.handlerSubmit}>{'导入用户'}</Button>
            }
          </div>
          <div className="cur-view-content" style={{display: 'flex', flexDirection: 'row'}}>
            <WorkWeixinDepartmentsTreePanel
              departmentsTree={this.state.departmentsTree}
              isTreeLoading={this.state.isTreeLoading}
              onChangeDepartment={this.onChangeDepartment}
              checkedDepartmentId={this.state.checkedDepartmentId}
            />
            <div className="dir-content-resize"></div>
            <WorkWeixinDepartmentMembersList
              isMembersListLoading={this.state.isMembersListLoading}
              membersList={this.state.membersList}
              checkedDepartmentId={this.state.checkedDepartmentId}
              newUsersTempObj={this.state.newUsersTempObj}
              handlerUser={this.handlerUser}
              handlerAllUsers={this.handlerAllUsers}
              isCheckedAll={this.state.isCheckedAll}
              canCheckUserIds={this.state.canCheckUserIds}
            />
          </div>
        </div>
      </div>
    );
  }
}

export default WorkWeixinDepartments;

