import React from 'react';
import PropTypes from 'prop-types';
import { Dropdown, DropdownToggle, DropdownMenu, DropdownItem } from 'reactstrap';
import { gettext, siteRoot, orgID, username } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import toaster from '../../components/toast';
import UserStatusEditor from '../../components/select-editor/user-status-editor';

const propTypes = {
  user: PropTypes.object,
  currentTab: PropTypes.string,
  toggleRevokeAdmin: PropTypes.func,
  isItemFreezed: PropTypes.bool.isRequired,
  toggleDelete: PropTypes.func.isRequired,
  onFreezedItem: PropTypes.func.isRequired,
  onUnfreezedItem: PropTypes.func.isRequired,
};

class UserItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      highlight: false,
      showMenu: false,
      currentStatus: this.props.user.is_active ? 'active' : 'inactive',
      isItemMenuShow: false
    };

    this.statusArray = ['active', 'inactive'];
  }

  onMouseEnter = () => {
    if (!this.props.isItemFreezed) {
      this.setState({
        showMenu: true,
        highlight: true,
      });
    }
  }

  onMouseLeave = () => {
    if (!this.props.isItemFreezed) {
      this.setState({
        showMenu: false,
        highlight: false
      });
    }
  } 

  toggleDelete = () => {
    const email = this.props.user.email;
    this.props.toggleDelete(email);
  }        
           
  toggleResetPW = () => {
    const email = this.props.user.email;
    toaster.success(gettext('Resetting user\'s password, please wait for a moment.'));
    seafileAPI.orgAdminResetOrgUserPassword(orgID, email).then(res => {
      let msg;
      msg = gettext('Successfully reset password to %(passwd)s for user %(user)s.');
      msg = msg.replace('%(passwd)s', res.data.new_password);
      msg = msg.replace('%(user)s', email);
      toaster.success(msg, {
        duration: 15
      });
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  toggleRevokeAdmin = () => {
    const email = this.props.user.email;
    this.props.toggleRevokeAdmin(email);
  }

  changeStatus = (st) => {
    let statusCode;
    if (st == 'active') {
      statusCode = 1;
    } else {
      statusCode = 0;
    }

    seafileAPI.orgAdminChangeOrgUserStatus(this.props.user.id, statusCode).then(res => {
      this.setState({
        currentStatus: statusCode == 1 ? 'active' : 'inactive',
        highlight: false,
        showMenu: false,
      });
      toaster.success(gettext('Edit succeeded.'));
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      if (errMessage === gettext('Error')) {
        errMessage = gettext('Edit failed.');
      }
      toaster.danger(errMessage);
    });
  }

  onDropdownToggleClick = (e) => {
    e.preventDefault();
    this.toggleOperationMenu(e);
  }

  toggleOperationMenu = (e) => {
    e.stopPropagation();
    this.setState(
      {isItemMenuShow: !this.state.isItemMenuShow }, () => {
        if (this.state.isItemMenuShow) {
          this.props.onFreezedItem();
        } else {
          this.setState({
            highlight: false,
            showMenu: false,
          });
          this.props.onUnfreezedItem();
        }
      }
    );
  }

  render() {
    let { user, currentTab } = this.props;
    let href = siteRoot + 'org/useradmin/info/' + encodeURIComponent(user.email) + '/';
    let isOperationMenuShow = (user.email !== username)  && this.state.showMenu;
    let isEditIconShow = isOperationMenuShow;
    return (
      <tr className={this.state.highlight ? 'tr-highlight' : ''} onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave}>
        <td>
          <a href={href} className="font-weight-normal">{user.name}</a>
        </td>
        <td>
          <UserStatusEditor 
            isTextMode={true}
            isEditIconShow={isEditIconShow}
            currentStatus={this.state.currentStatus}
            statusArray={this.statusArray}
            onStatusChanged={this.changeStatus}
          />
        </td>
        <td>{user.quota ? user.self_usage + ' / ' + user.quota : user.self_usage}</td>
        <td style={{'fontSize': '11px'}}>{user.ctime} / {user.last_login ? user.last_login : '--'}</td>
        <td className="text-center cursor-pointer">
          {isOperationMenuShow && (
            <Dropdown isOpen={this.state.isItemMenuShow} toggle={this.toggleOperationMenu}>
              <DropdownToggle
                tag="a"
                className="attr-action-icon fas fa-ellipsis-v"
                title={gettext('More Operations')}
                data-toggle="dropdown"
                aria-expanded={this.state.isItemMenuShow}
                onClick={this.onDropdownToggleClick}
              />
              <DropdownMenu>
                <DropdownItem onClick={this.toggleDelete}>{gettext('Delete')}</DropdownItem>
                <DropdownItem onClick={this.toggleResetPW}>{gettext('ResetPwd')}</DropdownItem>
                {currentTab == 'admins' && <DropdownItem onClick={this.toggleRevokeAdmin}>{gettext('Revoke Admin')}</DropdownItem>}
              </DropdownMenu>
            </Dropdown>
          )}
        </td>
      </tr>
    );
  }
}

UserItem.propTypes = propTypes;

export default UserItem;
