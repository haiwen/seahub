import React from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { gettext, isPro } from '../../utils/constants';
import { Button } from 'reactstrap';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils, isMobile } from '../../utils/utils';
import toaster from '../toast';
import UserSelect from '../user-select';
import SharePermissionEditor from '../select-editor/share-permission-editor';
import DepartmentDetailDialog from './department-detail-dialog';
import EmptyTip from '../../components/empty-tip';
import Loading from '../../components/loading';
import SelectUsersIcon from '../select-members-to-share-with';

import '../../css/invitations.css';
import '../../css/share-to-user.css';

class UserItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isHighlighted: false,
      isOperationShow: false,
      isUserDetailsPopoverOpen: false
    };
  }

  onMouseEnter = () => {
    this.setState({
      isHighlighted: true,
      isOperationShow: true
    });
  };

  onMouseLeave = () => {
    this.setState({
      isHighlighted: false,
      isOperationShow: false
    });
  };

  userAvatarOnMouseEnter = () => {
    this.setState({ isUserDetailsPopoverOpen: true });
  };

  userAvatarOnMouseLeave = () => {
    this.setState({ isUserDetailsPopoverOpen: false });
  };

  deleteShareItem = () => {
    this.props.deleteShareItem(this.props.item.user_info.name);
  };

  onChangeUserPermission = (permission) => {
    this.props.onChangeUserPermission(this.props.item, permission);
  };

  render() {
    let item = this.props.item;
    let currentPermission = Utils.getSharedPermission(item);
    const { isUserDetailsPopoverOpen, isHighlighted } = this.state;
    if (isMobile) {
      return (
        <tr>
          <td className="name">
            <div className="position-relative d-flex align-items-center">
              <img
                src={item.user_info.avatar_url}
                width="24"
                alt={item.user_info.nickname}
                className="rounded-circle mr-2 cursor-pointer"
                onMouseEnter={this.userAvatarOnMouseEnter}
                onMouseLeave={this.userAvatarOnMouseLeave}
              />
              <span>{item.user_info.nickname}</span>
              {isUserDetailsPopoverOpen && (
                <div className="user-details-popover p-4 position-absolute w-100 mt-1">
                  <div className="user-details-main pb-3">
                    <img
                      src={item.user_info.avatar_url}
                      width="40"
                      alt={item.user_info.nickname}
                      className="rounded-circle mr-2"
                    />
                    <span className="user-details-name">{item.user_info.nickname}</span>
                  </div>
                  <dl className="m-0 mt-3 d-flex">
                    <dt className="m-0 mr-3">{gettext('Email')}</dt>
                    <dd className="m-0">{item.user_info.contact_email}</dd>
                  </dl>
                </div>
              )}
            </div>
          </td>
          <td>
            <SharePermissionEditor
              repoID={this.props.repoID}
              isTextMode={true}
              autoFocus={true}
              isEditIconShow={true}
              currentPermission={currentPermission}
              permissions={this.props.permissions}
              onPermissionChanged={this.onChangeUserPermission}
            />
          </td>
          <td>
            <span
              tabIndex="0"
              role="button"
              className='sf3-font sf3-font-x-01 op-icon'
              onClick={this.deleteShareItem}
              onKeyDown={Utils.onKeyDown}
              title={gettext('Delete')}
              aria-label={gettext('Delete')}
            >
            </span>
          </td>
        </tr>
      );
    }
    return (
      <tr
        className={classnames({
          'tr-highlight': isHighlighted
        })}
        onMouseEnter={this.onMouseEnter}
        onMouseLeave={this.onMouseLeave}
        tabIndex="0"
        onFocus={this.onMouseEnter}
      >
        <td className="name">
          <div className="position-relative d-flex align-items-center">
            <img
              src={item.user_info.avatar_url}
              width="24"
              alt={item.user_info.nickname}
              className="rounded-circle mr-2 cursor-pointer"
              onMouseEnter={this.userAvatarOnMouseEnter}
              onMouseLeave={this.userAvatarOnMouseLeave}
            />
            <span>{item.user_info.nickname}</span>
            {isUserDetailsPopoverOpen && (
              <div className="user-details-popover p-4 position-absolute w-100 mt-1">
                <div className="user-details-main pb-3">
                  <img
                    src={item.user_info.avatar_url}
                    width="40"
                    alt={item.user_info.nickname}
                    className="rounded-circle mr-2"
                  />
                  <span className="user-details-name">{item.user_info.nickname}</span>
                </div>
                <dl className="m-0 mt-3 d-flex">
                  <dt className="m-0 mr-3">{gettext('Email')}</dt>
                  <dd className="m-0">{item.user_info.contact_email}</dd>
                </dl>
              </div>
            )}
          </div>
        </td>
        <td>
          <SharePermissionEditor
            repoID={this.props.repoID}
            isTextMode={true}
            autoFocus={true}
            isEditIconShow={this.state.isOperationShow}
            currentPermission={currentPermission}
            permissions={this.props.permissions}
            onPermissionChanged={this.onChangeUserPermission}
          />
        </td>
        <td>
          <span
            tabIndex="0"
            role="button"
            className={`sf3-font sf3-font-x-01 op-icon ${this.state.isOperationShow ? '' : 'd-none'}`}
            onClick={this.deleteShareItem}
            onKeyDown={Utils.onKeyDown}
            title={gettext('Delete')}
            aria-label={gettext('Delete')}
          >
          </span>
        </td>
      </tr>
    );
  }
}

UserItem.propTypes = {
  repoID: PropTypes.string.isRequired,
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
              repoID={this.props.repoID}
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
  repoID: PropTypes.string.isRequired,
  items: PropTypes.array.isRequired,
  permissions: PropTypes.array.isRequired,
  deleteShareItem: PropTypes.func.isRequired,
  onChangeUserPermission: PropTypes.func.isRequired,
};

const propTypes = {
  isGroupOwnedRepo: PropTypes.bool,
  itemPath: PropTypes.string.isRequired,
  itemType: PropTypes.string.isRequired,
  repoID: PropTypes.string.isRequired,
  isRepoOwner: PropTypes.bool.isRequired,
  repoType: PropTypes.string,
  onAddCustomPermissionToggle: PropTypes.func,
};

class ShareToUser extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      selectedUsers: [],
      errorMsg: [],
      permission: 'rw',
      sharedItems: [],
      isWiki: this.props.repoType === 'wiki',
      tmpUserList: [],
      isShowDepartmentDetailDialog: false,
      isLoading: true
    };
    this.options = [];
    this.permissions = [];
    let { itemType, isRepoOwner } = props;
    if (itemType === 'library') {
      this.permissions = isRepoOwner ? ['rw', 'r', 'admin', 'cloud-edit', 'preview'] : ['rw', 'r', 'cloud-edit', 'preview'];
    } else if (this.props.itemType === 'dir') {
      this.permissions = ['rw', 'r', 'cloud-edit', 'preview'];
    }
    if (!isPro) {
      this.permissions = ['rw', 'r'];
    }
    if (this.props.isGroupOwnedRepo) {
      this.permissions = ['rw', 'r', 'cloud-edit', 'preview'];
    }
    if (this.state.isWiki) {
      this.permissions = ['rw', 'r'];
    }
  }

  handleSelectChange = (option) => {
    this.setState({ selectedUsers: option });
    this.options = [];
  };

  componentDidMount() {
    let path = this.props.itemPath;
    let repoID = this.props.repoID;
    seafileAPI.listSharedItems(repoID, path, 'user').then((res) => {
      if (res.data.length !== 0) {
        let tmpUserList = res.data.map(item => {
          return {
            'email': item.user_info.name,
            'name': item.user_info.nickname,
            'avatar_url': item.user_info.avatar_url,
            'contact_email': item.user_info.contact_email,
            'permission': item.permission
          };
        });
        this.setState({
          sharedItems: res.data,
          tmpUserList: tmpUserList,
          isLoading: false
        });
      } else {
        this.setState({ isLoading: false });
      }
    }).catch(error => {
      this.setState({ isLoading: false });
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  setPermission = (permission) => {
    this.setState({ permission: permission });
  };

  shareToUser = () => {
    let users = [];
    let path = this.props.itemPath;
    let repoID = this.props.repoID;
    if (this.state.selectedUsers && this.state.selectedUsers.length > 0) {
      for (let i = 0; i < this.state.selectedUsers.length; i ++) {
        users[i] = this.state.selectedUsers[i].email;
      }
    }
    if (this.props.isGroupOwnedRepo) {
      seafileAPI.shareGroupOwnedRepoToUser(repoID, this.state.permission, users, path).then(res => {
        let errorMsg = [];
        if (res.data.failed.length > 0) {
          for (let i = 0 ; i < res.data.failed.length ; i++) {
            errorMsg[i] = res.data.failed[i];
          }
        }
        // todo modify api
        let items = res.data.success.map(item => {
          let sharedItem = {
            'user_info': { 'nickname': item.user_name, 'name': item.user_email },
            'permission': item.permission,
            'share_type': 'user',
          };
          return sharedItem;
        });
        this.setState({
          errorMsg: errorMsg,
          sharedItems: this.state.sharedItems.concat(items),
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
    } else {
      seafileAPI.shareFolder(repoID, path, 'user', this.state.permission, users).then(res => {
        let errorMsg = [];
        if (res.data.failed.length > 0) {
          for (let i = 0 ; i < res.data.failed.length ; i++) {
            errorMsg[i] = res.data.failed[i];
          }
        }
        this.setState({
          errorMsg: errorMsg,
          sharedItems: this.state.sharedItems.concat(res.data.success),
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
    }
  };

  deleteShareItem = (username) => {
    let path = this.props.itemPath;
    let repoID = this.props.repoID;
    if (this.props.isGroupOwnedRepo) {
      seafileAPI.deleteGroupOwnedRepoSharedUserItem(repoID, username, path).then(res => {
        this.setState({
          sharedItems: this.state.sharedItems.filter(item => { return item.user_info.name !== username; })
        });
      }).catch(error => {
        let errMessage = Utils.getErrorMsg(error);
        toaster.danger(errMessage);
      });
    } else {
      seafileAPI.deleteShareToUserItem(repoID, path, 'user', username).then(res => {
        this.setState({
          sharedItems: this.state.sharedItems.filter(item => { return item.user_info.name !== username; })
        });
      }).catch(error => {
        let errMessage = Utils.getErrorMsg(error);
        toaster.danger(errMessage);
      });
    }
  };

  onChangeUserPermission = (item, permission) => {
    let path = this.props.itemPath;
    let repoID = this.props.repoID;
    let username = item.user_info.name;
    if (this.props.isGroupOwnedRepo) {
      seafileAPI.modifyGroupOwnedRepoUserSharedPermission(repoID, permission, username, path).then(() => {
        this.updateSharedItems(item, permission);
      }).catch(error => {
        let errMessage = Utils.getErrorMsg(error);
        toaster.danger(errMessage);
      });
    } else {
      seafileAPI.updateShareToUserItemPermission(repoID, path, 'user', username, permission).then(() => {
        this.updateSharedItems(item, permission);
      }).catch(error => {
        let errMessage = Utils.getErrorMsg(error);
        toaster.danger(errMessage);
      });
    }
  };

  updateSharedItems = (item, permission) => {
    let username = item.user_info.name;
    let sharedItems = this.state.sharedItems.map(sharedItem => {
      let sharedItemUsername = sharedItem.user_info.name;
      if (username === sharedItemUsername) {
        sharedItem.permission = permission;
        sharedItem.is_admin = permission === 'admin' ? true : false;
      }
      return sharedItem;
    });
    this.setState({ sharedItems: sharedItems });
  };

  toggleDepartmentDetailDialog = () => {
    this.setState({ isShowDepartmentDetailDialog: !this.state.isShowDepartmentDetailDialog });
  };

  addUserShares = (membersSelectedObj) => {
    let path = this.props.itemPath;
    let repoID = this.props.repoID;
    let users = Object.keys(membersSelectedObj);

    if (this.props.isGroupOwnedRepo) {
      seafileAPI.shareGroupOwnedRepoToUser(repoID, this.state.permission, users, path).then(res => {
        let errorMsg = [];
        if (res.data.failed.length > 0) {
          for (let i = 0 ; i < res.data.failed.length ; i++) {
            errorMsg[i] = res.data.failed[i];
          }
        }
        // todo modify api
        let items = res.data.success.map(item => {
          let sharedItem = {
            'user_info': { 'nickname': item.user_name, 'name': item.user_email },
            'permission': item.permission,
            'share_type': 'user',
          };
          return sharedItem;
        });
        this.setState({
          errorMsg: errorMsg,
          sharedItems: this.state.sharedItems.concat(items),
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
    } else {
      seafileAPI.shareFolder(repoID, path, 'user', this.state.permission, users).then(res => {
        let errorMsg = [];
        if (res.data.failed.length > 0) {
          for (let i = 0 ; i < res.data.failed.length ; i++) {
            errorMsg[i] = res.data.failed[i];
          }
        }
        this.setState({
          errorMsg: errorMsg,
          sharedItems: this.state.sharedItems.concat(res.data.success),
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
    }
    this.toggleDepartmentDetailDialog();
  };

  render() {
    const { sharedItems } = this.state;
    let thead = (
      <thead>
        <tr>
          <th width="47%">{gettext('User')}</th>
          <th width="35%">{gettext('Permission')}</th>
          <th width="18%"></th>
        </tr>
      </thead>
    );
    if (isMobile) {
      thead = (
        <thead>
          <tr>
            <th width="43%">{gettext('User')}</th>
            <th width="35%">{gettext('Permission')}</th>
            <th width="22%"></th>
          </tr>
        </thead>
      );
    }
    return (
      <div className="share-link-container">
        <table>
          {thead}
          <tbody>
            <tr>
              <td>
                <div className='add-members'>
                  <UserSelect
                    isMulti={true}
                    className="share-to-user-select"
                    placeholder={gettext('Search users...')}
                    onSelectChange={this.handleSelectChange}
                    selectedUsers={this.state.selectedUsers}
                  />
                  <SelectUsersIcon onClick={this.toggleDepartmentDetailDialog} />
                </div>
              </td>
              <td>
                <SharePermissionEditor
                  repoID={this.props.repoID}
                  isTextMode={false}
                  isEditIconShow={false}
                  currentPermission={this.state.permission}
                  permissions={this.permissions}
                  onPermissionChanged={this.setPermission}
                  enableAddCustomPermission={isPro}
                  isWiki={this.state.isWiki}
                  onAddCustomPermissionToggle={this.props.onAddCustomPermissionToggle}
                />
              </td>
              <td>
                <Button color="primary" onClick={this.shareToUser} size={isMobile ? 'sm' : 'md'}>{gettext('Submit')}</Button>
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
          {this.state.isLoading ? (
            <Loading />
          ) : (
            <>
              {sharedItems.length === 0 ? (
                <EmptyTip text={gettext('No share link')} />
              ) : (
                <table className="table-thead-hidden">
                  {thead}
                  <UserList
                    repoID={this.props.repoID}
                    items={sharedItems}
                    permissions={this.permissions}
                    deleteShareItem={this.deleteShareItem}
                    onChangeUserPermission={this.onChangeUserPermission}
                  />
                </table>
              )}
            </>
          )}
          {this.state.isShowDepartmentDetailDialog &&
          <DepartmentDetailDialog
            toggleDepartmentDetailDialog={this.toggleDepartmentDetailDialog}
            addUserShares={this.addUserShares}
            userList={this.state.tmpUserList}
            usedFor='add_user_share'
          />
          }
        </div>
      </div>
    );
  }
}

ShareToUser.propTypes = propTypes;

export default ShareToUser;
