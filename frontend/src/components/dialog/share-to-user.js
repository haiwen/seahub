import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import AsyncSelect from 'react-select/lib/Async';
import { gettext, isPro } from '../../utils/constants';
import { Button } from 'reactstrap';
import { seafileAPI } from '../../utils/seafile-api.js';
import SharePermissionEditor from '../select-editor/share-permission-editor';

class UserItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isOperationShow: false
    };
  }
  
  onMouseEnter = () => {
    this.setState({isOperationShow: true});
  }

  onMouseLeave = () => {
    this.setState({isOperationShow: false});
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
    let currentPermission = item.is_admin ? 'admin' : item.permission;
    return (
      <tr onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave}>
        <td className="name">{item.user_info.nickname}</td>
        <td>
          <SharePermissionEditor 
            isTextMode={true}
            isEditIconShow={this.state.isOperationShow}
            currentPermission={currentPermission}
            permissions={this.props.permissions}
            onPermissionChanged={this.onChangeUserPermission}
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

const propTypes = {
  isGroupOwnedRepo: PropTypes.bool,
  itemPath: PropTypes.string.isRequired,
  repoID: PropTypes.string.isRequired
};

const NoOptionsMessage = (props) => {
  return (
    <div {...props.innerProps} style={{margin: '6px 10px', textAlign: 'center', color: 'hsl(0,0%,50%)'}}>{gettext('User not found')}</div>
  );
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
    this.permissions = ['rw', 'r', 'admin', 'cloud-edit', 'preview'];
    if (this.props.isGroupOwnedRepo || !isPro) {
      this.permissions = ['rw', 'r'];
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
    });
  }

  setPermission = (permission) => {
    this.setState({permission: permission});
  }

  loadOptions = (value, callback) => {
    if (value.trim().length > 0) {
      seafileAPI.searchUsers(value.trim()).then((res) => {
        this.options = [];
        for (let i = 0 ; i < res.data.users.length; i++) {
          let obj = {};
          obj.value = res.data.users[i].name;
          obj.email = res.data.users[i].email;
          obj.label =
            <Fragment>
              <img src={res.data.users[i].avatar_url} className="select-module select-module-icon avatar" alt="Avatar"/>
              <span className='select-module select-module-name'>{res.data.users[i].name}</span>
            </Fragment>;
          this.options.push(obj);
        }
        callback(this.options);
      });
    }
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
      seafileAPI.shareGroupOwnedRepoToUser(repoID, this.state.permission, users).then(res => {
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
      seafileAPI.deleteGroupOwnedRepoSharedUserItem(repoID, username).then(res => {
        this.setState({
          sharedItems: this.state.sharedItems.filter( item => { return item.user_info.name !== username; }) 
        });
      });
    } else {
      seafileAPI.deleteShareToUserItem(repoID, path, 'user', username).then(res => {
        this.setState({
          sharedItems: this.state.sharedItems.filter( item => { return item.user_info.name !== username; }) 
        });
      });
    }
  }

  onChangeUserPermission = (item, permission) => {
    let path = this.props.itemPath;
    let repoID = this.props.repoID;
    let username = item.user_info.name;
    if (this.props.isGroupOwnedRepo) {
      seafileAPI.modifyGroupOwnedRepoUserSharedPermission(repoID, permission, username).then(() => {
        this.updateSharedItems(item, permission);
      });
    } else {
      seafileAPI.updateShareToUserItemPermission(repoID, path, 'user', username, permission).then(() => {
        this.updateSharedItems(item, permission);
      });
    }
  }
  
  updateSharedItems = (item, permission) => {
    let username = item.user_info.name;
    let sharedItems = this.state.sharedItems.map(sharedItem => {
      let sharedItemUsername = sharedItem.user_info.name;
      if (username === sharedItemUsername) {
        sharedItem.permission = permission;
      }
      sharedItem.is_admin = permission === 'admin' ? true : false;
      return sharedItem;
    });
    this.setState({sharedItems: sharedItems});
  }

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
                <AsyncSelect
                  inputId={'react-select-1-input'}
                  className='reviewer-select' 
                  placeholder={gettext('Select users...')}
                  loadOptions={this.loadOptions}
                  onChange={this.handleSelectChange}
                  value={this.state.selectedOption}
                  components={{ NoOptionsMessage }}
                  maxMenuHeight={200}
                  isMulti 
                  isFocused
                  isClearable 
                  classNamePrefix
                />
              </td>
              <td>
                <SharePermissionEditor 
                  isTextMode={false}
                  isEditIconShow={false}
                  currentPermission={this.state.permission}
                  permissions={this.permissions}
                  onPermissionChanged={this.setPermission}
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

ShareToUser.propTypes = propTypes;

export default ShareToUser;
