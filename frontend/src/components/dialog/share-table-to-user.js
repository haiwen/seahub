import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { gettext, canInvitePeople, siteRoot } from '../../utils/constants';
import { Button } from 'reactstrap';
import { seafileAPI } from '../../utils/seafile-api.js';
import UserSelect from '../user-select';
import DtableSharePermissionEditor from '../select-editor/dtable-share-permission-editor';
import toaster from '../toast';

import '../../css/invitations.css';

const userItemPropTypes = {
  item: PropTypes.object.isRequired,
  deleteTableShare: PropTypes.func.isRequired,
  updateTableShare: PropTypes.func.isRequired,
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

  deleteTableShare = () => {
    this.props.deleteTableShare(this.props.item.email);
  };

  updateTableShare = (permission) => {
    this.props.updateTableShare(this.props.item.email, permission);
  };

  render() {
    let item = this.props.item;
    let currentPermission = item.permission;
    return (
      <tr onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave}>
        <td className="name">{item.name}</td>
        <td>
          <DtableSharePermissionEditor
            isTextMode={true}
            isEditIconShow={this.state.isOperationShow}
            currentPermission={currentPermission}
            onPermissionChanged={this.updateTableShare}
          />
        </td>
        <td>
          <span
            className={`sf2-icon-x3 action-icon ${this.state.isOperationShow ? '' : 'hide'}`}
            onClick={this.deleteTableShare}
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
      selectedOptions: null,
      permission: 'rw',
      userList: []
    };
    this.workspaceID = this.props.currentTable.workspace_id;
    this.tableName = this.props.currentTable.name;
  }

  componentDidMount() {
    seafileAPI.listTableShares(this.workspaceID, this.tableName).then((res) => {
      this.setState({userList: res.data.user_list});
    });
  }

  handleSelectChange = (options) => {
    this.setState({ selectedOptions: options });
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

  addTableShare = () => {
    const { selectedOptions, permission, userList } = this.state;
    if (!selectedOptions || selectedOptions.length === 0) return;
    for (let i = 0; i < selectedOptions.length; i++) {
      let name = selectedOptions[i].value;
      let email = selectedOptions[i].email;
      seafileAPI.addTableShare(this.workspaceID, this.tableName, email, permission).then((res) => {
        let userInfo = {
          name: name,
          email: email,
          permission: permission,
        };
        userList.push(userInfo);
        this.setState({ userList: userList });
      }).catch(error => {
        this.handleError(error);
      });
    }
    this.setState({ selectedOption: null });
    this.refs.userSelect.clearSelect();
  };

  deleteTableShare = (email) => {
    seafileAPI.deleteTableShare(this.workspaceID, this.tableName, email).then((res) => {
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

  updateTableShare = (email, permission) => {
    seafileAPI.updateTableShare(this.workspaceID, this.tableName, email, permission).then((res) => {
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
          permissions={['rw', 'r']}
          deleteTableShare={this.deleteTableShare}
          updateTableShare={this.updateTableShare}
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
                  isMulti={true}
                  className="reviewer-select"
                  placeholder={gettext('Select users...')}
                  onSelectChange={this.handleSelectChange}
                />
              </td>
              <td>
                <DtableSharePermissionEditor
                  isTextMode={false}
                  isEditIconShow={false}
                  currentPermission={this.state.permission}
                  onPermissionChanged={this.setPermission}
                />
              </td>
              <td>
                <Button onClick={this.addTableShare}>{gettext('Submit')}</Button>
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
