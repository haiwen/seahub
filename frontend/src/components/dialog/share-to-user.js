import React from 'react';
import AsyncSelect from 'react-select/lib/Async';
import { gettext } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import PropTypes from 'prop-types';
import { Button, Label, Input, Table} from 'reactstrap';
import { seafileAPI } from '../../utils/seafile-api.js';

const propTypes = {
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
    this.Options = [];
  }

  handleSelectChange = (option) => {
    this.setState({
      selectedOption: option,
    });
    this.Options = [];
  }

  componentDidMount() {
    let path = this.props.itemPath;
    let repoID = this.props.repoID;
    seafileAPI.listSharedItems(repoID, path, 'user')
      .then((res) => {
        if(res.data.length !== 0) {
          this.setState({
            sharedItems: res.data
          })  
        }
      })
  }

  setPermission = (e) => {
    if (e.target.value == 'Read-Write') {
      this.setState({
        permission: 'rw',
      })
    } else if (e.target.value == 'Read-Only') {
      this.setState({
        permission: 'r',
      })
    } else if (e.target.value == 'Admin') {
      this.setState({
        permission: 'admin',
      })
    } else if (e.target.value == 'Preview-Edit-on-Cloud') {
      this.setState({
        permission: 'clod-edit',
      })
    } else if (e.target.value == 'Preview-on-Cloud') {
      this.setState({
        permission: 'preview',
      })
    } 
  }

  loadOptions = (value, callback) => {
    if (value.trim().length > 0) {
      seafileAPI.searchUsers(value.trim()).then((res) => {
        this.Options = [];
        for (let i = 0 ; i < res.data.users.length; i++) {
          let obj = {};
          obj.value = res.data.users[i].name;
          obj.email = res.data.users[i].email;
          obj.label =
            <React.Fragment>
              <img src={res.data.users[i].avatar_url} className="avatar reviewer-select-avatar" alt=""/>
              <span className='reviewer-select-name'>{res.data.users[i].name}</span>
            </React.Fragment>;
          this.Options.push(obj);
        }
        callback(this.Options);
      });
    }
  }

  shareToUser = () => {
    let users = [];
    let path = this.props.itemPath; 
    let repoID = this.props.repoID;
    if (this.state.selectedOption.length > 0 ) {
      for (let i = 0; i < this.state.selectedOption.length; i ++) {
        users[i] = this.state.selectedOption[i].email;
      }
    }
    seafileAPI.shareFolder(repoID, path, 'user', this.state.permission, users) 
      .then(res => {
        if (res.data.failed.length > 0) {
          let errorMsg = [];
          for (let i = 0 ; i < res.data.failed.length ; i++) {
            errorMsg[i] = res.data.failed[i];
          }
          this.setState({
            errorMsg: errorMsg
          });
        }
        this.setState({
          sharedItems: this.state.sharedItems.concat(res.data.success)
        })
      })
  } 

  deleteShareItem = (e, username) => {
    e.preventDefault();
    let path = this.props.itemPath;
    let repoID = this.props.repoID;
    seafileAPI.deleteShareToUserItem(repoID, path, 'user', username)
      .then(res => {
        this.setState({
          sharedItems: this.state.sharedItems.filter( item => { return item.user_info.name !== username }) 
        })
      })
  }

  render() {
    let { sharedItems } = this.state;
    return (
      <Table>
        <thead> 
          <tr>
            <th style={{'width': '50%'}}>{gettext('User')}</th>
            <th style={{'width': '30%'}}>{gettext('Permission')}</th>
            <th></th>
          </tr>
          <tr>
            <td>
              <AsyncSelect
                className='reviewer-select' isMulti isFocused
                loadOptions={this.loadOptions}
                placeholder={gettext('Please enter 1 or more character')}
                onChange={this.handleSelectChange}
                isClearable classNamePrefix
                inputId={"react-select-1-input"}
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
            {this.state.errorMsg.length > 0 &&
              this.state.errorMsg.map((item, index = 0, arr) => {
                return (
                  <p className="error" key={index}>{this.state.errorMsg[index].email}
                    {': '}{this.state.errorMsg[index].error_msg}</p>
                );
              })
            }
          </tr>
        </thead>
        <UserList items={sharedItems}
                  deleteShareItem={this.deleteShareItem}
                  />
      </Table>
    );
  }
}


function UserList(props) {
    return (
      <tbody>
        {props.items.map((item, index) => (
          <tr key={index}>
            <td>{item.user_info.nickname}</td>
            <td>{Utils.sharePerms[item.permission]}</td>
            <td><i onClick={(e) => {props.deleteShareItem(e, item.user_info.name)}} className="sf2-icon-delete" title="Delete"></i></td>
          </tr>
        ))}
      </tbody>
    )
}

ShareToUser.propTypes = propTypes;

export default ShareToUser;
