import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { gettext, isPro } from '../../utils/constants';
import { Button } from 'reactstrap';
import { seafileAPI } from '../../utils/seafile-api.js';
import { Utils } from '../../utils/utils';
import toaster from '../toast';
import UserSelect from '../user-select';
import SharePermissionEditor from '../select-editor/share-permission-editor';
import '../../css/invitations.css';

import '../../css/share-to-user.css';

class UserItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isOperationShow: false,
      isUserDetailsPopoverOpen: false
    };
  }

  onMouseEnter = () => {
    this.setState({isOperationShow: true});
  }

  onMouseLeave = () => {
    this.setState({isOperationShow: false});
  }

  userAvatarOnMouseEnter = () => {
    this.setState({isUserDetailsPopoverOpen: true});
  }

  userAvatarOnMouseLeave = () => {
    this.setState({isUserDetailsPopoverOpen: false});
  }

  deleteShareItem = () => {
    let item = this.props.item;
    this.props.deleteShareItem(item.user_info.name);
  }

  onChangeUserPermission = (permission) => {
    let item = this.props.item;
    this.props.onChangeUserPermission(item, permission);
  }

  render() {
    let item = this.props.item;
    let currentPermission = Utils.getSharedPermission(item);
    const { isUserDetailsPopoverOpen } = this.state;
    return (
      <tr onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave} tabIndex="0" onFocus={this.onMouseEnter}>
        <td className="name">
          <div className="position-relative">
            <img src={item.user_info.avatar_url}
              width="24" alt={item.user_info.nickname}
              className="rounded-circle mr-2 cursor-pointer"
              onMouseEnter={this.userAvatarOnMouseEnter}
              onMouseLeave={this.userAvatarOnMouseLeave} />
            <span>{item.user_info.nickname}</span>
            {isUserDetailsPopoverOpen && (
              <div className="user-details-popover p-4 position-absolute w-100 mt-1">
                <div className="user-details-main pb-3">
                  <img src={item.user_info.avatar_url} width="40"
                    alt={item.user_info.nickname}
                    className="rounded-circle mr-2" />
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
            className={`sf2-icon-x3 action-icon ${this.state.isOperationShow ? '' : 'hide'}`}
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

const propTypes = {
  isGroupOwnedRepo: PropTypes.bool,
  itemPath: PropTypes.string.isRequired,
  itemType: PropTypes.string.isRequired,
  repoID: PropTypes.string.isRequired,
  isRepoOwner: PropTypes.bool.isRequired,
  onAddCustomPermissionToggle: PropTypes.func,
};

class ShareToUser extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      selectedOption: null,
      errorMsg: [],
      permission: 'rw',
      sharedItems: []
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
  }

  handleSelectChange = (option) => {
    this.setState({selectedOption: option});
    this.options = [];
  }

  componentDidMount() {
    let path = this.props.itemPath;
    let repoID = this.props.repoID;
    seafileAPI.listSharedItems(repoID, path, 'user').then((res) => {
      if(res.data.length !== 0) {
        this.setState({sharedItems: res.data});
      }
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  setPermission = (permission) => {
    this.setState({permission: permission});
  }

  shareToUser = () => {
    let users = [];
    let path = this.props.itemPath;
    let repoID = this.props.repoID;
    if (this.state.selectedOption && this.state.selectedOption.length > 0 ) {
      for (let i = 0; i < this.state.selectedOption.length; i ++) {
        users[i] = this.state.selectedOption[i].email;
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
            'user_info': { 'nickname': item.user_name, 'name': item.user_email},
            'permission': item.permission,
            'share_type': 'user',
          };
          return sharedItem;
        });
        this.setState({
          errorMsg: errorMsg,
          sharedItems: this.state.sharedItems.concat(items),
          selectedOption: null,
          permission: 'rw',
        });
        this.refs.userSelect.clearSelect();
      }).catch(error => {
        if (error.response) {
          let message = gettext('Library can not be shared to owner.');
          let errMessage = [];
          errMessage.push(message);
          this.setState({
            errorMsg: errMessage,
            selectedOption: null,
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
          selectedOption: null,
          permission: 'rw',
        });
        this.refs.userSelect.clearSelect();
      }).catch(error => {
        if (error.response) {
          let message = gettext('Library can not be shared to owner.');
          let errMessage = [];
          errMessage.push(message);
          this.setState({
            errorMsg: errMessage,
            selectedOption: null,
          });
        }
      });
    }
  }

  deleteShareItem = (username) => {
    let path = this.props.itemPath;
    let repoID = this.props.repoID;
    if (this.props.isGroupOwnedRepo) {
      seafileAPI.deleteGroupOwnedRepoSharedUserItem(repoID, username, path).then(res => {
        this.setState({
          sharedItems: this.state.sharedItems.filter( item => { return item.user_info.name !== username; })
        });
      }).catch(error => {
        let errMessage = Utils.getErrorMsg(error);
        toaster.danger(errMessage);
      });
    } else {
      seafileAPI.deleteShareToUserItem(repoID, path, 'user', username).then(res => {
        this.setState({
          sharedItems: this.state.sharedItems.filter( item => { return item.user_info.name !== username; })
        });
      }).catch(error => {
        let errMessage = Utils.getErrorMsg(error);
        toaster.danger(errMessage);
      });
    }
  }

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
  }

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
    this.setState({sharedItems: sharedItems});
  }

  render() {
    let { sharedItems } = this.state;
    const thead = (
      <thead>
        <tr>
          <th width="47%">{gettext('User')}</th>
          <th width="35%">{gettext('Permission')}</th>
          <th width="18%"></th>
        </tr>
      </thead>
    );
    return (
      <Fragment>
        <table className="w-xs-200">
          {thead}
          <tbody>
            <tr>
              <td>
                <UserSelect
                  ref="userSelect"
                  isMulti={true}
                  className="reviewer-select"
                  placeholder={gettext('Search users...')}
                  onSelectChange={this.handleSelectChange}
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
                  enableAddCustomPermission={isPro}
                  onAddCustomPermissionToggle={this.props.onAddCustomPermissionToggle}
                />
              </td>
              <td>
                <Button onClick={this.shareToUser}>{gettext('Submit')}</Button>
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
          <table className="table-thead-hidden w-xs-200">
            {thead}
            <UserList
              repoID={this.props.repoID}
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

ShareToUser.propTypes = propTypes;

export default ShareToUser;
