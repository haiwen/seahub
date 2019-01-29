import React, { Fragment } from 'react';

import PropTypes from 'prop-types';
import { Dropdown, DropdownToggle, DropdownMenu, DropdownItem } from 'reactstrap';

import { gettext, siteRoot, orgID, username } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import Toast from '../../components/toast';
import { Utils } from '../../utils/utils';
import UserStatusEditor from '../../components/select-editor/user-status-editor';


const propTypes = {
  currentTab: PropTypes.string,
  toggleRevokeAdmin: PropTypes.func,
  toggleDelete: PropTypes.func.isRequired,
};


class UserItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      highlight: '',
      showMenu: false,
      currentStatus: this.props.user.is_active ? 'active' : 'inactive',
      isShowOpMenu: false
    };

    this.statusArray = ['active', 'inactive'];
  }

  onMouseEnter = () => {
    this.setState({
      showMenu: true,
      highlight: 'tr-highlight'
    });
  }

  onMouseLeave = () => {
    this.setState({
      showMenu: false,
      highlight: ''
    });
  } 

  toggleDelete = () => {
    const email = this.props.user.email;
    this.props.toggleDelete(email);
  }        
           
  toggleResetPW = () => {
    const email = this.props.user.email;
    seafileAPI.resetOrgUserPassword(orgID, email).then(res => {
      let msg;
      msg = gettext('Successfully reset password to %(passwd)s for user %(user)s.');
      msg = msg.replace('%(passwd)s', res.data.new_password);
      msg = msg.replace('%(user)s', email);
      Toast.success(msg);
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

    seafileAPI.changeOrgUserStatus(this.props.user.id, statusCode).then(res => {
      this.setState({
        currentStatus: statusCode == 1 ? 'active' : 'inactive' 
      });
      Toast.success(gettext('Edit succeeded.'));
    }).catch(err => {
      Toast.danger(gettext('Edit falied.'));
    });
  }

  clickMenuToggle = (e) => {
    e.preventDefault();
    this.onMenuToggle(e);
  }

  onMenuToggle = (e) => {
    let targetType = e.target.dataset.toggle;
    if (targetType !== 'item') {
      this.setState({
        highlight: '',
        isShowMenu: false,
        isShowOpMenu: !this.state.isShowOpMenu
      });
    }
  } 

  render() {
    let showMenu = (this.props.user.email !== username)  && this.state.showMenu;
    return (
      <tr className={this.state.highlight} onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave}>
        <td>
          <a className="font-weight-normal" href={siteRoot + 'org/useradmin/info/' + encodeURIComponent(this.props.user.email) + '/'}>
            {this.props.user.name}
          </a>
        </td>
        <td>
          <UserStatusEditor 
            isTextMode={true}
            isEditIconShow={showMenu}
            currentStatus={this.state.currentStatus}
            statusArray={this.statusArray}
            onStatusChanged={this.changeStatus}
          />
        </td>
        <td>{this.props.user.quota ? this.props.user.self_usage + ' / ' + this.props.user.quota : this.props.user.self_usage}</td>
        <td style={{ 'fontSize': '11px'}}>{this.props.user.ctime} / {this.props.user.last_login ? this.props.user.last_login : '--'}</td>
        {(this.state.showMenu) ?
          <td className="text-center cursor-pointer">
            {showMenu && (
              <Dropdown isOpen={this.state.isShowOpMenu} toggle={this.onMenuToggle}>
                <DropdownToggle
                  tag="a"
                  className="fas fa-ellipsis-v"
                  title={gettext('More Operations')}
                  data-toggle="dropdown"
                  aria-expanded={this.state.isShowOpMenu}
                  onClick={this.clickMenuToggle}
                />
                <DropdownMenu>
                   <DropdownItem onClick={this.toggleDelete}>{gettext('Delete')}</DropdownItem>
                   <DropdownItem onClick={this.toggleResetPW}>{gettext('ResetPwd')}</DropdownItem>
                   {this.props.currentTab == 'admins' &&
                     <DropdownItem onClick={this.toggleRevokeAdmin}>{gettext('Revoke Admin')}</DropdownItem>
                   }
                 </DropdownMenu>
               </Dropdown>
            )}
          </td> : <td></td>
        }
      </tr>
    );
  }
}

UserItem.propTypes = propTypes;

export default UserItem;
