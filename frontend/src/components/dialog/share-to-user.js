import React, { Fragment } from 'react';
import AsyncSelect from 'react-select/lib/Async';
import { gettext } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import PropTypes from 'prop-types';
import { Button, Input } from 'reactstrap';
import { seafileAPI } from '../../utils/seafile-api.js';

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

  render() {
    let item = this.props.item;
    return (
      <tr onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave}>
        <td>{item.user_info.nickname}</td>
        <td>{Utils.sharePerms(item.permission)}</td>
        <td>
          <span
            className={`sf2-icon-x3 sf2-x op-icon a-simulate ${this.state.isOperationShow ? '' : 'hide'}`}
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
            <UserItem key={index} item={item} deleteShareItem={this.props.deleteShareItem}/>
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

  setPermission = (e) => {
    if (e.target.value == 'Read-Write') {
      this.setState({
        permission: 'rw',
      });
    } else if (e.target.value == 'Read-Only') {
      this.setState({
        permission: 'r',
      });
    } else if (e.target.value == 'Admin') {
      this.setState({
        permission: 'admin',
      });
    } else if (e.target.value == 'Preview-Edit-on-Cloud') {
      this.setState({
        permission: 'cloud-edit',
      });
    } else if (e.target.value == 'Preview-on-Cloud') {
      this.setState({
        permission: 'preview',
      });
    } 
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
              <img src={res.data.users[i].avatar_url} className="avatar reviewer-select-avatar" alt=""/>
              <span className='reviewer-select-name'>{res.data.users[i].name}</span>
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
        if (res.data.failed.length > 0) {
          let errorMsg = [];
          for (let i = 0 ; i < res.data.failed.length ; i++) {
            errorMsg[i] = res.data.failed[i];
          }
          this.setState({errorMsg: errorMsg});
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
          sharedItems: this.state.sharedItems.concat(items),
          selectedOption: null,
        });
      });
    } else {
      seafileAPI.shareFolder(repoID, path, 'user', this.state.permission, users).then(res => {
        if (res.data.failed.length > 0) {
          let errorMsg = [];
          for (let i = 0 ; i < res.data.failed.length ; i++) {
            errorMsg[i] = res.data.failed[i];
          }
          this.setState({errorMsg: errorMsg});
        }
        this.setState({
          sharedItems: this.state.sharedItems.concat(res.data.success),
          selectedOption: null,
        });
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

  render() {
    let { sharedItems } = this.state;
    return (
      <table>
        <thead> 
          <tr>
            <th style={{'width': '50%'}}>{gettext('User')}</th>
            <th style={{'width': '30%'}}>{gettext('Permission')}</th>
            <th></th>
          </tr>
          <tr>
            <td>
              <AsyncSelect
                inputId={'react-select-1-input'}
                className='reviewer-select' 
                placeholder={gettext('Please enter 1 or more character')}
                loadOptions={this.loadOptions}
                onChange={this.handleSelectChange}
                value={this.state.selectedOption}
                isMulti 
                isFocused
                isClearable 
                classNamePrefix
              />
            </td>
            <td>
              <Input type="select" name="select" onChange={this.setPermission}>
                <option>{gettext('Read-Write')}</option>
                <option>{gettext('Read-Only')}</option>
                <option>{gettext('Admin')}</option>
                <option>{gettext('Preview-Edit-on-Cloud')}</option>
                <option>{gettext('Preview-on-Cloud')}</option>
              </Input>
            </td>
            <td>
              <Button onClick={this.shareToUser}>{gettext('Submit')}</Button>
            </td>
          </tr>
          <tr>
            <td colSpan={3}>
              {this.state.errorMsg.length > 0 &&
                this.state.errorMsg.map((item, index = 0, arr) => {
                  return (
                    <p className="error" key={index}>{this.state.errorMsg[index].email}
                      {': '}{this.state.errorMsg[index].error_msg}</p>
                  );
                })
              }
            </td>
          </tr>
        </thead>
        <UserList items={sharedItems} deleteShareItem={this.deleteShareItem} />
      </table>
    );
  }
}

ShareToUser.propTypes = propTypes;

export default ShareToUser;
