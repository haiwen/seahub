import React, {Component, Fragment} from 'react';
import PropTypes from 'prop-types';
import {seafileAPI} from '../../utils/seafile-api';
import {gettext} from '../../utils/constants';
import toaster from '../../components/toast';
import Loading from '../../components/loading';
import {CustomInput, FormGroup, Button} from 'reactstrap';


class WorkWeixinDepartmentsTreeNode extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isChildrenShow: false,
    };
  }

  toggleChildren = () => {
    if (!(this.props.department.id in this.props.membersObj)) {
      this.props.getWorkWeixinDepartmentsMembersList(this.props.department.id);
    }
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
            membersObj={this.props.membersObj}
            getWorkWeixinDepartmentsMembersList={this.props.getWorkWeixinDepartmentsMembersList}
            handlerNewUsers={this.props.handlerNewUsers}
          />
        );
      });
    }
  };

  componentDidMount() {
    if (this.props.department.id === 1) {
      this.toggleChildren();
    }
  }

  render() {
    return (
      <div>
        {this.props.isChildrenShow &&
        <i
          onClick={() => this.toggleChildren()}
          className={!this.state.isChildrenShow ? 'folder-toggle-icon fa fa-caret-right' : 'folder-toggle-icon fa fa-caret-down'}
        >{this.props.department.name}</i>
        }
        {(this.state.isChildrenShow && (this.props.department.id in this.props.membersObj)) &&
        <div style={{left: '30px', position: 'relative'}}>
          <FormGroup>
            <Fragment>
              {this.props.membersObj[this.props.department.id].map((member, index) => {
                return (
                  <CustomInput
                    id={member.userid}
                    key={member.userid}
                    style={{color: 'blue'}}
                    type="checkbox"
                    label={member.name}
                    onChange={() => this.props.handlerNewUsers(member)}
                  />
                );
              })
              }
            </Fragment>
          </FormGroup>
          {this.props.department.children && this.renderTreeNodes(this.props.department.children)}
        </div>
        }
      </div>
    );
  }
}

class WorkWeixinDepartmentsPanel extends Component {
  constructor(props) {
    super(props);
    this.newUsersObj = {};
    this.emailDomain = '@work.weixin.com';
    this.password = '!';
    this.state = {
      isLoading: true,
      departmentsTree: {},
      membersObj: {},
    };
  }

  handlerDepartmentsList = (list) => {
    let cloneData = JSON.parse(JSON.stringify(list));
    return cloneData.filter(father => {
      let branchArr = cloneData.filter(child => father.id === child.parentid);
      branchArr.length > 0 ? father.children = branchArr : '';
      return father.parentid === 0;
    });
  };

  getWorkWeixinDepartmentsList = () => {
    seafileAPI.listWorkWeixinDepartments().then((res) => {
      let departmentsTree = this.handlerDepartmentsList(res.data.department)[0];
      this.setState({
        isLoading: false,
        departmentsTree: departmentsTree,
      });
    }).catch((error) => {
      this.setState({isLoading: false});
      if (error.response) {
        toaster.danger(error.response.data.error_msg || error.response.data.detail || gettext('Error'), {duration: 3});
      } else {
        toaster.danger(gettext('Please check the network.'), {duration: 3});
      }
    });
  };

  getWorkWeixinDepartmentsMembersList = (department_id) => {
    let params = {fetch_child: 1};
    seafileAPI.listWorkWeixinDepartmentMembers(department_id.toString(), params).then((res) => {
      let membersObj = this.state.membersObj;
      membersObj[department_id] = res.data.userlist;
      this.setState({
        membersObj: membersObj,
      });
    }).catch((error) => {
      this.setState({isLoading: false});
      if (error.response) {
        toaster.danger(error.response.data.error_msg || error.response.data.detail || gettext('Error'), {duration: 3});
      } else {
        toaster.danger(gettext('Please check the network.'), {duration: 3});
      }
    });
  };

  handlerNewUsers = (member) => {
    if (member.userid in this.newUsersObj) {
      delete this.newUsersObj[member.userid];
    } else {
      this.newUsersObj[member.userid] = member;
    }
  };

  handlerNewUsersObjToSubmit = () => {
    let newUsersList = [];
    for (let i in this.newUsersObj) {
      newUsersList.push(this.newUsersObj[i]);
    }
    return newUsersList;
  };

  handlerSubmit = () => {
    let newUsersList = this.handlerNewUsersObjToSubmit();
    if (!newUsersList.length) {
      toaster.danger('未选择成员', {duration: 3});
    } else {
      for (let i = 0; i < newUsersList.length; i++) {
        let user = newUsersList[i];
        let userParams = {
          email: user.userid + this.emailDomain,
          name: user.name,
          password: this.password
        };
        seafileAPI.adminAddUser(userParams).then((res) => {
          toaster.success('成功添加 ' + user.name, {duration: 1});
        }).catch((error) => {
          if (error.response) {
            toaster.danger(error.response.data.error_msg || error.response.data.detail || gettext('Error'), {duration: 3});
          } else {
            toaster.danger(gettext('Please check the network.'), {duration: 3});
          }
        });
      }
    }

  };

  componentDidMount() {
    this.getWorkWeixinDepartmentsList();
  }

  render() {
    return (
      <div>
        {this.state.isLoading && <Loading/>}
        {!this.state.isLoading &&
        <div className="tree-node">
          {JSON.stringify(this.state.departmentsTree) !== '{}' &&
          <WorkWeixinDepartmentsTreeNode
            department={this.state.departmentsTree}
            isChildrenShow={true}
            membersObj={this.state.membersObj}
            getWorkWeixinDepartmentsMembersList={this.getWorkWeixinDepartmentsMembersList}
            handlerNewUsers={this.handlerNewUsers}
          />
          }
        </div>
        }
        {!this.state.isLoading &&
        <Button color="secondary" onClick={this.handlerSubmit}>{gettext('Submit')}</Button>
        }
      </div>
    );
  }
}

class WorkWeixinDepartments extends Component {

  render() {
    return (
      <div className="main-panel-center">
        <div className="cur-view-container">
          <div className="cur-view-path">
            <h3 className="sf-heading">{'企业微信组织架构'}</h3>
          </div>
          <div className="cur-view-content">
            <WorkWeixinDepartmentsPanel/>
          </div>
        </div>
      </div>
    );
  }
}

export default WorkWeixinDepartments;

