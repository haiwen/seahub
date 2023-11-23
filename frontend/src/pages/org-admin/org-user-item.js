import React from 'react';
import PropTypes from 'prop-types';
import { Dropdown, DropdownToggle, DropdownMenu, DropdownItem } from 'reactstrap';
import { gettext, siteRoot, orgID, username } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import toaster from '../../components/toast';
import Selector from '../../components/single-selector';

const propTypes = {
  user: PropTypes.object,
  currentTab: PropTypes.string,
  toggleRevokeAdmin: PropTypes.func,
  isItemFreezed: PropTypes.bool.isRequired,
  toggleDelete: PropTypes.func.isRequired,
  onFreezedItem: PropTypes.func.isRequired,
  onUnfreezedItem: PropTypes.func.isRequired,
  toggleItemFreezed: PropTypes.func.isRequired,
  changeStatus: PropTypes.func.isRequired,
};

class UserItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      highlight: false,
      showMenu: false,
      isItemMenuShow: false
    };
  }

  onMouseEnter = () => {
    if (!this.props.isItemFreezed) {
      this.setState({
        showMenu: true,
        highlight: true,
      });
    }
  };

  onMouseLeave = () => {
    if (!this.props.isItemFreezed) {
      this.setState({
        showMenu: false,
        highlight: false
      });
    }
  };

  toggleDelete = () => {
    const email = this.props.user.email;
    const username = this.props.user.name;
    this.props.toggleDelete(email, username);
  };

  toggleResetPW = () => {
    const { email, name } = this.props.user;
    toaster.success(gettext('Resetting user\'s password, please wait for a moment.'));
    seafileAPI.orgAdminResetOrgUserPassword(orgID, email).then(res => {
      let msg;
      msg = gettext('Successfully reset password to %(passwd)s for user %(user)s.');
      msg = msg.replace('%(passwd)s', res.data.new_password);
      msg = msg.replace('%(user)s', name);
      toaster.success(msg, {
        duration: 15
      });
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  toggleRevokeAdmin = () => {
    const email = this.props.user.email;
    this.props.toggleRevokeAdmin(email);
  };

  changeStatus = (statusOption) => {
    const isActive = statusOption.value == 'active';
    if (isActive) {
      toaster.notify(gettext('It may take some time, please wait.'));
    }
    this.props.changeStatus(this.props.user.email, isActive);
  };

  onDropdownToggleClick = (e) => {
    e.preventDefault();
    this.toggleOperationMenu(e);
  };

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
  };

  getQuotaTotal = (data) => {
    switch (data) {
      case -1: // failed to fetch quota
        return gettext('Failed');
      case -2:
        return '--';
      default: // data > 0
        return Utils.formatSize({bytes: data});
    }
  };

  translateStatus = (status) => {
    switch (status) {
      case 'active':
        return gettext('Active');
      case 'inactive':
        return gettext('Inactive');
    }
  };

  render() {
    const { highlight } = this.state;
    let { user, currentTab } = this.props;
    let href = siteRoot + 'org/useradmin/info/' + encodeURIComponent(user.email) + '/';
    let isOperationMenuShow = (user.email !== username)  && this.state.showMenu;

    // for 'user status'
    const curStatus = user.is_active ? 'active' : 'inactive';
    this.statusOptions = ['active', 'inactive'].map(item => {
      return {
        value: item,
        text: this.translateStatus(item),
        isSelected: item == curStatus
      };
    });
    const currentSelectedStatusOption = this.statusOptions.filter(item => item.isSelected)[0];

    return (
      <tr className={this.state.highlight ? 'tr-highlight' : ''} onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave}>
        <td>
          <a href={href}>{user.name}</a>
        </td>
        <td>
          <Selector
            isDropdownToggleShown={highlight}
            currentSelectedOption={currentSelectedStatusOption}
            options={this.statusOptions}
            selectOption={this.changeStatus}
            toggleItemFreezed={this.props.toggleItemFreezed}
          />
        </td>
        <td>{`${Utils.formatSize({bytes: user.quota_usage})} / ${this.getQuotaTotal(user.quota_total)}`}</td>
        <td>
          {user.ctime} /
          <br />
          {user.last_login ? user.last_login : '--'}
        </td>
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
