import React, { Component, Fragment } from 'react';
import { Button, Form, FormGroup, Input, Col } from 'reactstrap';
import { Utils } from '../../../utils/utils';
import { seafileAPI } from '../../../utils/seafile-api';
import { gettext, loginUrl } from '../../../utils/constants';
import toaster from '../../../components/toast';
import SysAdminUserSetQuotaDialog from '../../../components/dialog/sysadmin-dialog/set-quota';
import CommonOperationConfirmationDialog from '../../../components/dialog/common-operation-confirmation-dialog';
import MainPanelTopbar from '../main-panel-topbar';
import Content from './users-content';


class SearchUsers extends Component {

  constructor(props) {
    super(props);
    this.state = {
      query: '',
      isSubmitBtnActive: false,
      loading: true,
      errorMsg: '',
      userList: [],
      hasUserSelected: false,
      selectedUserList: [],
      isAllUsersSelected: false,
      isBatchSetQuotaDialogOpen: false,
      isBatchDeleteUserDialogOpen: false
    };
  }

  componentDidMount () {
    let params = (new URL(document.location)).searchParams;
    this.setState({
      query: params.get('query') || ''
    }, this.getItems);
  }

  toggleBatchSetQuotaDialog = () => {
    this.setState({isBatchSetQuotaDialogOpen: !this.state.isBatchSetQuotaDialogOpen});
  }

  toggleBatchDeleteUserDialog = () => {
    this.setState({isBatchDeleteUserDialogOpen: !this.state.isBatchDeleteUserDialogOpen});
  }

  onUserSelected = (item) => {
    let hasUserSelected = false;
    let selectedUserList = [];
    // traverse all users, toggle its selected status
    let users = this.state.userList.map(user => {
      // toggle status
      if (user.email === item.email) {
        user.isSelected = !user.isSelected;
      }
      // update selectedUserList
      // if current user is now selected, push it to selectedUserList
      // if current user is now not selected, drop it from selectedUserList
      if (user.isSelected == true) {
        hasUserSelected = true;
        selectedUserList.push(user);
      } else {
        selectedUserList = selectedUserList.filter(thisuser => {
          return thisuser.email != user.email;
        });
      }
      return user;
    });
    // finally update state
    this.setState({
      userList: users,
      hasUserSelected: hasUserSelected,
      selectedUserList: selectedUserList,
    });
  }

  toggleSelectAllUsers = () => {
    if (this.state.isAllUsersSelected) {
      // if previous state is allSelected, toggle to not select
      let users = this.state.userList.map(user => {
        user.isSelected = false;
        return user;
      });
      this.setState({
        userList: users,
        hasUserSelected: false,
        isAllUsersSelected: false,
        selectedUserList: [],
      });
    } else {
      // if previous state is not allSelected, toggle to selectAll
      let users = this.state.userList.map(user => {
        user.isSelected = true;
        return user;
      });
      this.setState({
        userList: users,
        hasUserSelected: true,
        isAllUsersSelected: true,
        selectedUserList: users
      });
    }
  }

  getItems = () => {
    seafileAPI.sysAdminSearchUsers(this.state.query.trim()).then(res => {
      this.setState({
        userList: res.data.user_list,
        loading: false
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

  deleteUser = (email) => {
    seafileAPI.sysAdminDeleteUser(email).then(res => {
      let newUserList = this.state.userList.filter(item => {
        return item.email != email;
      });
      this.setState({userList: newUserList});
      toaster.success(gettext('Successfully deleted 1 item.'));
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  setUserQuotaInBatch = (quotaTotal) => {
    let emails = this.state.selectedUserList.map(user => {
      return user.email;
    });
    seafileAPI.sysAdminSetUserQuotaInBatch(emails, quotaTotal).then(res => {
      let userList = this.state.userList.map(item => {
        res.data.success.map(resultUser => {
          if (item.email == resultUser.email) {
            item.quota_total = resultUser.quota_total;
          }
        });
        return item;
      });
      this.setState({userList: userList});
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  deleteUserInBatch = () => {
    let emails = this.state.selectedUserList.map(user => {
      return user.email;
    });
    seafileAPI.sysAdminDeleteUserInBatch(emails).then(res => {
      if (res.data.success.length) {
        let oldUserList = this.state.userList;
        let newUserList = oldUserList.filter(oldUser => {
          return !res.data.success.some(deletedUser =>{
            return deletedUser.email == oldUser.email;
          });
        });
        this.setState({
          userList: newUserList,
          hasUserSelected: emails.length != res.data.success.length
        });
        const length = res.data.success.length;
        const msg = length == 1 ?
          gettext('Successfully deleted 1 user.') :
          gettext('Successfully deleted {user_number_placeholder} users.')
            .replace('{user_number_placeholder}', length);
        toaster.success(msg);
      }
      res.data.failed.map(item => {
        const msg = `${item.email}: ${item.error_msg}`;
        toaster.danger(msg);
      });
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  updateUser = (email, key, value) => {
    seafileAPI.sysAdminUpdateUser(email, key, value).then(res => {
      let newUserList = this.state.userList.map(item => {
        if (item.email == email) {
          item[key]= res.data[key];
        }
        return item;
      });
      this.setState({userList: newUserList});
      const msg = (key == 'is_active' && value) ? 
        res.data.update_status_tip : gettext('Edit succeeded');
      toaster.success(msg);
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  updateAdminRole = (email, role) => {
    seafileAPI.sysAdminUpdateAdminRole(email, role).then(res => {
      let newUserList = this.state.userList.map(item => {
        if (item.email == email) {
          item.admin_role = res.data.role;
        }
        return item;
      });
      this.setState({userList: newUserList});
      toaster.success(gettext('Edit succeeded'));
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  revokeAdmin = (email, name) => {
    seafileAPI.sysAdminUpdateUser(email, 'is_staff', false).then(res => {
      let userList = this.state.userList.filter(item => {
        return item.email != email;
      }); 
      this.setState({
        userList: userList
      });
      toaster.success(gettext('Successfully revoked the admin permission of {placeholder}'.replace('{placeholder}', name)));
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  handleInputChange = (e) => {
    this.setState({ 
      query: e.target.value
    }, this.checkSubmitBtnActive);
  }                 

  checkSubmitBtnActive = () => {
    const { query } = this.state;
    this.setState({
      isSubmitBtnActive: query.trim()
    });
  }

  render() {
    const { query, isSubmitBtnActive } = this.state;
    const {
      hasUserSelected, 
      isBatchDeleteUserDialogOpen, 
      isBatchSetQuotaDialogOpen
    } = this.state;
    return (
      <Fragment>
        {hasUserSelected ?
          <MainPanelTopbar>
            <Fragment>
              <Button className="btn btn-secondary operation-item" onClick={this.toggleBatchSetQuotaDialog}>{gettext('Set Quota')}</Button>
              <Button className="btn btn-secondary operation-item" onClick={this.toggleBatchDeleteUserDialog}>{gettext('Delete Users')}</Button>
            </Fragment>
          </MainPanelTopbar> :
          <MainPanelTopbar />
        }
        <div className="main-panel-center flex-row">
          <div className="cur-view-container">
            <div className="cur-view-path">
              <h3 className="sf-heading">{gettext('Users')}</h3>
            </div>
            <div className="cur-view-content">
              <div className="mt-4 mb-6">
                <h4 className="border-bottom font-weight-normal mb-2 pb-1">{gettext('Search Users')}</h4>
                <Form>
                  <FormGroup row>
                    <Col sm={5}>
                      <Input type="text" name="query" value={query} placeholder={gettext('Search users')} onChange={this.handleInputChange} />
                    </Col>
                  </FormGroup>
                  <FormGroup row>
                    <Col sm={{size: 5}}>
                      <button className="btn btn-outline-primary" disabled={!isSubmitBtnActive} onClick={this.getItems}>{gettext('Submit')}</button>
                    </Col>
                  </FormGroup>
                </Form>
              </div>
              <div className="mt-4 mb-6">
                <h4 className="border-bottom font-weight-normal mb-2 pb-1">{gettext('Result')}</h4>
                <Content
                  isLDAPImported={false}
                  isAdmin={false}
                  isSearchResult={true}
                  loading={this.state.loading}
                  errorMsg={this.state.errorMsg}
                  items={this.state.userList}
                  updateUser={this.updateUser}
                  deleteUser={this.deleteUser}
                  updateAdminRole={this.updateAdminRole}
                  revokeAdmin={this.revokeAdmin}
                  onUserSelected={this.onUserSelected}
                  isAllUsersSelected={this.isAllUsersSelected}
                  toggleSelectAllUsers={this.toggleSelectAllUsers}
                />
              </div>
            </div>
          </div>
        </div>
        {isBatchSetQuotaDialogOpen &&
          <SysAdminUserSetQuotaDialog
            toggle={this.toggleBatchSetQuotaDialog}
            updateQuota={this.setUserQuotaInBatch}
          />
        }
        {isBatchDeleteUserDialogOpen &&
          <CommonOperationConfirmationDialog
            title={gettext('Delete Users')}
            message={gettext('Are you sure you want to delete the selected user(s) ?')}
            executeOperation={this.deleteUserInBatch}
            confirmBtnText={gettext('Delete')}
            toggleDialog={this.toggleBatchDeleteUserDialog}
          />
        }
      </Fragment>
    );
  }
}

export default SearchUsers;
