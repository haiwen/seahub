import React, { Component, Fragment } from 'react';
import { seafileAPI } from '../../../utils/seafile-api';
import { siteRoot, loginUrl, gettext } from '../../../utils/constants';
import { Label, Button} from 'reactstrap';
import toaster from '../../../components/toast';
import { Utils } from '../../../utils/utils';
import EmptyTip from '../../../components/empty-tip';
import Loading from '../../../components/loading';
import GroupNav from './group-nav';
import MainPanelTopbar from '../main-panel-topbar';
import SysAdminGroupAddMemberDialog from '../../../components/dialog/sysadmin-dialog/sysadmin-group-add-member-dialog';
import CommonOperationDialog from '../../../components/dialog/common-operation-dialog';
import SysAdminGroupRoleEditor from '../../../components/select-editor/sysadmin-group-role-editor';

class Content extends Component {

  constructor(props) {
    super(props);
  }

  render() {
    const { loading, errorMsg, items } = this.props;
    if (loading) {
      return <Loading />;
    } else if (errorMsg) {
      return <p className="error text-center">{errorMsg}</p>;
    } else {
      const emptyTip = (
        <EmptyTip>
          <h2>{gettext('No members')}</h2>
        </EmptyTip>
      );
      const table = (
        <Fragment>
          <table className="table-hover">
            <thead>
              <tr>
                <th width="5%">{/* icon */}</th>
                <th width="55%">{gettext('Name')}</th>
                <th width="20%">{gettext('Role')}</th>
                <th width="20%">{gettext('Operations')}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                return (<Item
                  key={index}
                  item={item}
                  dropMember={this.props.dropMember}
                  updateMemberRole={this.props.updateMemberRole}
                />);
              })}
            </tbody>
          </table>
        </Fragment>
      );
      return items.length ? table : emptyTip; 
    }
  }
}

class Item extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isOpIconShown: false,
      isDeleteDialogOpen: false
    };
  }

  handleMouseEnter = () => {
    this.setState({isOpIconShown: true});
  }

  handleMouseLeave = () => {
    this.setState({isOpIconShown: false});
  }

  toggleDeleteDialog = (e) => {
    if (e) {
      e.preventDefault();
    }
    this.setState({isDeleteDialogOpen: !this.state.isDeleteDialogOpen});
  }

  dropMember = () => {
    this.props.dropMember(this.props.item.email);
    this.toggleDeleteDialog();
  }

  updateMemberRole = (role) => {
    this.props.updateMemberRole(this.props.item.email, role);
  }

  render() {
    let { isOpIconShown, isDeleteDialogOpen } = this.state;
    let { item } = this.props;

    let iconVisibility = isOpIconShown ? '' : ' invisible'; 
    let deleteIconClassName = 'op-icon sf2-icon-delete' + iconVisibility;

    let repoName = '<span class="op-target">' + Utils.HTMLescape(item.name) + '</span>';
    let deleteDialogMsg = gettext('Are you sure you want to unshare {placeholder} ?'.replace('{placeholder}', repoName));

    return (
      <Fragment>
        <tr onMouseEnter={this.handleMouseEnter} onMouseLeave={this.handleMouseLeave}>
          <td><img src={item.avatar_url} alt="" className="user-avatar" width="24" /></td>
          <td><a href={siteRoot + 'sys/user-info/' + item.email + '/'}>{item.name}</a></td>
          <td>
            <SysAdminGroupRoleEditor 
              isTextMode={true}
              isEditIconShow={isOpIconShown}
              roleOptions={['Member', 'Admin']}
              currentRole={item.role}
              onRoleChanged={this.updateMemberRole}
            />
          </td>
          <td>
            <a href="#" className={deleteIconClassName} title={gettext('Delete')} onClick={this.toggleDeleteDialog}></a>
          </td>
        </tr>
        {isDeleteDialogOpen &&
          <CommonOperationDialog
            title={gettext('Delete Member')}
            message={deleteDialogMsg}
            toggle={this.toggleDeleteDialog}
            executeOperation={this.dropMember}
            confirmBtnText={gettext('Delete')}
          />
        }
      </Fragment>
    );
  }
}

class GroupMembers extends Component {

  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: '',
      groupName: '',
      memberList: [],
      isAddMemberDialogOpen: false,
    };
  }

  componentDidMount () {
    seafileAPI.sysAdminListMembersOfGroup(this.props.groupID).then((res) => {
      this.setState({
        loading: false,
        memberList: res.data.members,
        groupName: res.data.group_name
      });
    }).catch((error) => {
      if (error.response) {
        if (error.response.status == 403) {
          this.setState({
            loading: false,
            errorMsg: gettext('Permission denied')
          });
          location.href = `${loginUrl}?next=${encodeURIComponent(location.href)}`;
        } else {
          this.setState({
            loading: false,
            errorMsg: gettext('Error')
          });
        }
      } else {
        this.setState({
          loading: false,
          errorMsg: gettext('Please check the network.')
        });
      }
    });
  }

  toggleAddMemgerDialog = () => {
    this.setState({isAddMemberDialogOpen: !this.state.isAddMemberDialogOpen});
  }

  addMember = (users) => {
    let emails = users.map(user => {return user.email;});
    seafileAPI.sysAdminAddGroupMember(this.props.groupID, emails).then(res => {
      let newMemberList = res.data.success;
      newMemberList = newMemberList.concat(this.state.memberList);
      this.setState({
        memberList: newMemberList
      });
      this.toggleAddMemgerDialog();
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  dropMember = (email) => {
    seafileAPI.sysAdminDropGroupMember(this.props.groupID, email).then(res => {
      let newRepoList = this.state.memberList.filter(item => {
        return item.email != email;
      });
      this.setState({
        memberList: newRepoList
      });
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  updateMemberRole = (email, role) => {
    let isAdmin = role === 'Admin';
    seafileAPI.sysAdminUpdateGroupMemberRole(this.props.groupID, email, isAdmin).then(res => {
      let newRepoList = this.state.memberList.map(item => {
        if (item.email === email) {
          item.role = role;
        }
        return item;
      });
      this.setState({
        memberList: newRepoList
      });
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  render() {
    let { isAddMemberDialogOpen } = this.state;
    return (
      <Fragment>
        <MainPanelTopbar>
          <Button className="btn btn-secondary operation-item ml-3" onClick={this.toggleAddMemgerDialog}>{gettext('Add Member')}</Button>
        </MainPanelTopbar>
        <div className="main-panel-center flex-row">
          <div className="cur-view-container">
            <GroupNav 
              currentItem="members"
              groupID={this.props.groupID}
            />
            <div className="cur-view-content">
              <Content
                loading={this.state.loading}
                errorMsg={this.state.errorMsg}
                items={this.state.memberList}
                dropMember={this.dropMember}
                updateMemberRole={this.updateMemberRole}
              />
            </div>
          </div>
        </div>
        {isAddMemberDialogOpen &&
          <SysAdminGroupAddMemberDialog
            toggle={this.toggleAddMemgerDialog}
            submit={this.addMember}
          />
        }
      </Fragment>
    );
  }
}

export default GroupMembers;
