import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import {gettext, isPro, canInvitePeople, siteRoot, username} from '../../utils/constants';
import { Button } from 'reactstrap';
import { seafileAPI } from '../../utils/seafile-api.js';
import UserSelect from '../user-select';
import SharePermissionEditor from '../select-editor/share-permission-editor';
import toaster from '../toast';

import '../../css/invitations.css';

const userItemPropTypes = {
  item: PropTypes.object.isRequired,
  permissions: PropTypes.array.isRequired,
  deleteShareTable: PropTypes.func.isRequired,
  changeShareTablePermission: PropTypes.func.isRequired,
};

class UserItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isOperationShow: false
    };
  }

  onMouseEnter = () => {
    this.setState({isOperationShow: true});
  };

  onMouseLeave = () => {
    this.setState({isOperationShow: false});
  };

  deleteShareTable = () => {
    this.props.deleteShareTable(this.props.item.email);
  };

  changeShareTablePermission = (permission) => {
    this.props.changeShareTablePermission(this.props.item.email, permission);
  };

  render() {
    let item = this.props.item;
    let currentPermission = item.permission;
    return (
      <tr onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave}>
        <td className="name">{item.name}</td>
        <td>
          <SharePermissionEditor
            isTextMode={true}
            isEditIconShow={this.state.isOperationShow}
            currentPermission={currentPermission}
            permissions={this.props.permissions}
            onPermissionChanged={this.changeShareTablePermission}
          />
        </td>
        <td>
          <span
            className={`sf2-icon-x3 action-icon ${this.state.isOperationShow ? '' : 'hide'}`}
            onClick={this.deleteShareTable}
            title={gettext('Delete')}
          >
          </span>
        </td>
      </tr>
    );
  }
}

UserItem.propTypes = userItemPropTypes;

const propTypes = {
  currentTable: PropTypes.object.isRequired,
};

class ShareTableToUser extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      selectedOption: null,
      permission: 'rw',
      userList: []
    };
    this.permissions = ['rw', 'r', 'admin', 'cloud-edit', 'preview'];
    this.workspaceID = this.props.currentTable.workspace_id;
    this.tableName = this.props.currentTable.name;
  }

  componentDidMount() {
    seafileAPI.listShareTableUser(this.workspaceID, this.tableName).then((res) => {
      this.setState({userList: res.data.user_list});
    });
  }

  handleSelectChange = (option) => {
    this.setState({selectedOption: option});
  };

  setPermission = (permission) => {
    this.setState({permission: permission});
  };

  handleError = (e) => {
    if (e.response) {
      toaster.danger(e.response.data.error_msg || e.response.data.detail || gettext('Error'), {duration: 3});
    } else {
      toaster.danger(gettext('Please check the network.'), {duration: 3});
    }
  };

  addShareTable = () => {
    if (!this.state.selectedOption || this.state.selectedOption.length === 0) {
      return;
    }
    let name = this.state.selectedOption.value;
    let email = this.state.selectedOption.email;
    let permission = this.state.permission;
    seafileAPI.addShareTable(this.workspaceID, this.tableName, email, permission).then((res) => {
      let userList = this.state.userList;
      let userInfo = {
        name: name,
        email: email,
        permission: permission,
      };
      userList.push(userInfo);
      this.setState({
        userList: userList,
        selectedOption: null,
      });
    }).catch(error => {
      this.handleError(error);
      this.setState({
        selectedOption: null,
      });
    });
  };

  deleteShareTable = (email) => {
    seafileAPI.deleteShareTable(this.workspaceID, this.tableName, email).then((res) => {
      let userList = this.state.userList.filter(userInfo => {
        return userInfo.email !== email;
      });
      this.setState({
        userList: userList,
      });
    }).catch(error => {
      this.handleError(error);
    });
  };

  changeShareTablePermission = (email, permission) => {
    seafileAPI.modifyShareTablePermission(this.workspaceID, this.tableName, email, permission).then((res) => {
      let userList = this.state.userList.filter(userInfo => {
        if (userInfo.email === email) {
          userInfo.permission = permission;
        }
        return userInfo;
      });
      this.setState({
        userList: userList,
      });
    }).catch(error => {
      this.handleError(error);
    });
  };

  render() {
    const renderUserList = this.state.userList.map((item, index) => {
      return (
        <UserItem
          key={index}
          item={item}
          permissions={this.permissions}
          deleteShareTable={this.deleteShareTable}
          changeShareTablePermission={this.changeShareTablePermission}
        />
      );
    });

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
                  ref="userSelect"
                  isMulti={false}
                  className="reviewer-select"
                  placeholder={gettext('Select users...')}
                  onSelectChange={this.handleSelectChange}
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
                <Button onClick={this.addShareTable}>{gettext('Submit')}</Button>
              </td>
            </tr>
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
            <tbody>
              {renderUserList}
            </tbody>
          </table>
          { canInvitePeople &&
          <a href={siteRoot + 'invitations/'} className="invite-link-in-popup">
            <i className="sf2-icon-invite invite-link-icon-in-popup"></i>
            <span className="invite-link-icon-in-popup">{gettext('Invite People')}</span>
          </a>
          }
        </div>
      </Fragment>
    );
  }
}

ShareTableToUser.propTypes = propTypes;

export default ShareTableToUser;
