import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { isPro, gettext } from '../../../utils/constants';
import { Button } from 'reactstrap';
import { systemAdminAPI } from '../../../utils/system-admin-api';
import { Utils } from '../../../utils/utils';
import toaster from '../../toast';
import UserSelect from '../../user-select';
import SharePermissionEditor from '../../select-editor/share-permission-editor';

class UserItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isOperationShow: false
    };
  }

  onMouseEnter = () => {
    this.setState({ isOperationShow: true });
  };

  onMouseLeave = () => {
    this.setState({ isOperationShow: false });
  };

  deleteShareItem = () => {
    let item = this.props.item;
    this.props.deleteShareItem(item.user_email);
  };

  onChangeUserPermission = (permission) => {
    let item = this.props.item;
    this.props.onChangeUserPermission(item, permission);
  };

  render() {
    let item = this.props.item;
    let currentPermission = Utils.getSharedPermission(item);
    return (
      <tr onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave}>
        <td className="name">{item.user_name}</td>
        <td>
          <SharePermissionEditor
            repoID={item.repo_id}
            isTextMode={true}
            autoFocus={true}
            isEditIconShow={this.state.isOperationShow}
            currentPermission={currentPermission}
            permissions={this.props.permissions}
            onPermissionChanged={this.onChangeUserPermission}
            isSysAdmin={true}
          />
        </td>
        <td>
          <span
            className={`sf2-icon-x3 action-icon ${this.state.isOperationShow ? '' : 'hide'}`}
            onClick={this.deleteShareItem}
            title={gettext('Delete')}
          >
          </span>
        </td>
      </tr>
    );
  }
}

UserItem.propTypes = {
  item: PropTypes.object.isRequired,
  permissions: PropTypes.array.isRequired,
  deleteShareItem: PropTypes.func.isRequired,
  onChangeUserPermission: PropTypes.func.isRequired,
};

class UserList extends React.Component {

  render() {
    let items = this.props.items;
    return (
      <tbody>
        {items.map((item, index) => {
          return (
            <UserItem
              key={index}
              item={item}
              permissions={this.props.permissions}
              deleteShareItem={this.props.deleteShareItem}
              onChangeUserPermission={this.props.onChangeUserPermission}
            />
          );
        })}
      </tbody>
    );
  }
}

UserList.propTypes = {
  items: PropTypes.array.isRequired,
  permissions: PropTypes.array.isRequired,
  deleteShareItem: PropTypes.func.isRequired,
  onChangeUserPermission: PropTypes.func.isRequired,
};

const propTypes = {
  isGroupOwnedRepo: PropTypes.bool,
  itemPath: PropTypes.string.isRequired,
  itemType: PropTypes.string.isRequired,
  repoID: PropTypes.string.isRequired
};

class SysAdminShareToUser extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      selectedUsers: [],
      errorMsg: [],
      permission: 'rw',
      sharedItems: []
    };
    this.options = [];
    this.permissions = ['rw', 'r'];
    if (isPro) {
      this.permissions.push('admin', 'cloud-edit', 'preview');
    }
  }

  handleSelectChange = (options) => {
    this.setState({ selectedUsers: options });
    this.options = [];
  };

  componentDidMount() {
    let repoID = this.props.repoID;
    systemAdminAPI.sysAdminListRepoSharedItems(repoID, 'user').then((res) => {
      if (res.data.length !== 0) {
        this.setState({ sharedItems: res.data });
      }
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  setPermission = (permission) => {
    this.setState({ permission: permission });
  };

  shareToUser = () => {
    let users = [];
    let repoID = this.props.repoID;
    if (this.state.selectedUsers && this.state.selectedUsers.length > 0) {
      for (let i = 0; i < this.state.selectedUsers.length; i ++) {
        users[i] = this.state.selectedUsers[i].email;
      }
    }
    systemAdminAPI.sysAdminAddRepoSharedItem(repoID, 'user', users, this.state.permission).then(res => {
      let errorMsg = [];
      if (res.data.failed.length > 0) {
        for (let i = 0 ; i < res.data.failed.length ; i++) {
          errorMsg[i] = res.data.failed[i];
        }
      }
      let newItems = res.data.success;
      this.setState({
        errorMsg: errorMsg,
        sharedItems: this.state.sharedItems.concat(newItems),
        selectedUsers: [],
        permission: 'rw',
      });
    }).catch(error => {
      if (error.response) {
        let message = gettext('Library can not be shared to owner.');
        let errMessage = [];
        errMessage.push(message);
        this.setState({
          errorMsg: errMessage,
          selectedUsers: [],
        });
      }
    });
  };

  deleteShareItem = (useremail) => {
    let repoID = this.props.repoID;
    systemAdminAPI.sysAdminDeleteRepoSharedItem(repoID, 'user', useremail).then(res => {
      this.setState({
        sharedItems: this.state.sharedItems.filter(item => { return item.user_email !== useremail; })
      });
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  onChangeUserPermission = (item, permission) => {
    let repoID = this.props.repoID;
    let userEmail = item.user_email;
    systemAdminAPI.sysAdminUpdateRepoSharedItemPermission(repoID, 'user', userEmail, permission).then(() => {
      this.updateSharedItems(item, permission);
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  updateSharedItems = (item, permission) => {
    let username = item.user_name;
    let sharedItems = this.state.sharedItems.map(sharedItem => {
      let sharedItemUsername = sharedItem.user_name;
      if (username === sharedItemUsername) {
        sharedItem.permission = permission;
        sharedItem.is_admin = permission === 'admin' ? true : false;
      }
      return sharedItem;
    });
    this.setState({ sharedItems: sharedItems });
  };

  render() {
    let { sharedItems } = this.state;
    return (
      <Fragment>
        <table>
          <thead>
            <tr>
              <th width="50%">{gettext('User')}</th>
              <th width="35%">{gettext('Permission')}</th>
              <th width="15%"></th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <UserSelect
                  isMulti={true}
                  placeholder={gettext('Search users')}
                  onSelectChange={this.handleSelectChange}
                  selectedUsers={this.state.selectedUsers}
                />
              </td>
              <td>
                <SharePermissionEditor
                  repoID={this.props.repoID}
                  isTextMode={false}
                  isEditIconShow={false}
                  currentPermission={this.state.permission}
                  permissions={this.permissions}
                  onPermissionChanged={this.setPermission}
                  isSysAdmin={true}
                />
              </td>
              <td>
                <Button color="primary" onClick={this.shareToUser}>{gettext('Submit')}</Button>
              </td>
            </tr>
            {this.state.errorMsg.length > 0 &&
              this.state.errorMsg.map((item, index) => {
                let errMessage = '';
                if (item.email) {
                  errMessage = item.email + ': ' + item.error_msg;
                } else {
                  errMessage = item;
                }
                return (
                  <tr key={index}>
                    <td colSpan={3}><p className="error">{errMessage}</p></td>
                  </tr>
                );
              })
            }
          </tbody>
        </table>
        <div className="share-list-container">
          <table className="table-thead-hidden">
            <thead>
              <tr>
                <th width="50%">{gettext('User')}</th>
                <th width="35%">{gettext('Permission')}</th>
                <th width="15%"></th>
              </tr>
            </thead>
            <UserList
              items={sharedItems}
              permissions={this.permissions}
              deleteShareItem={this.deleteShareItem}
              onChangeUserPermission={this.onChangeUserPermission}
            />
          </table>
        </div>
      </Fragment>
    );
  }
}

SysAdminShareToUser.propTypes = propTypes;

export default SysAdminShareToUser;
