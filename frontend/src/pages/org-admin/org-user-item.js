import React from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalBody, ModalFooter, Button } from 'reactstrap';
import SeahubModalHeader from '@/components/common/seahub-modal-header';
import { gettext, siteRoot, orgID, username } from '../../utils/constants';
import { orgAdminAPI } from '../../utils/org-admin-api';
import { Utils } from '../../utils/utils';
import toaster from '../../components/toast';
import Selector from '../../components/single-selector';
import CommonOperationConfirmationDialog from '../../components/dialog/common-operation-confirmation-dialog';
import CustomDropdown from '../../components/dropdown';

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
      isDropdownFrozen: false,
      isResetPasswordDialogOpen: false,
      turnstileToken: '',
      turnstileWidgetId: null
    };
    this.turnstileRef = React.createRef();
  }

  componentWillUnmount() {
    if (this.state.turnstileWidgetId !== null && window.turnstile) {
      window.turnstile.remove(this.state.turnstileWidgetId);
    }
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

  renderTurnstileWidget = () => {
    if (window.org && window.org.pageOptions && window.org.pageOptions.enableTurnstile && this.turnstileRef.current) {
      const renderTurnstile = () => {
        if (window.turnstile) {
          try {
            const widgetId = window.turnstile.render(this.turnstileRef.current, {
              sitekey: window.org.pageOptions.turnstileSiteKey,
              callback: (token) => {
                this.setState({ turnstileToken: token });
              }
            });
            this.setState({ turnstileWidgetId: widgetId });
          } catch (e) {
            //
          }
        }
      };

      if (window.turnstile) {
        renderTurnstile();
      } else if (window.turnstileLoadPromise) {
        window.turnstileLoadPromise.then(() => {
          renderTurnstile();
        });
      }
    }
  };

  toggleResetPW = () => {
    const oldWidgetId = this.state.turnstileWidgetId;
    this.setState({ isResetPasswordDialogOpen: !this.state.isResetPasswordDialogOpen, turnstileToken: '', turnstileWidgetId: null }, () => {
      if (!this.state.isResetPasswordDialogOpen && oldWidgetId !== null && window.turnstile) {
        window.turnstile.remove(oldWidgetId);
      }
    });
  };

  executeResetPW = () => {
    if (window.org && window.org.pageOptions && window.org.pageOptions.enableTurnstile && !this.state.turnstileToken) {
      toaster.danger(gettext('Please complete the Turnstile challenge'));
      return;
    }
    const { email } = this.props.user;
    toaster.success(gettext('Resetting user\'s password, please wait for a moment.'));
    orgAdminAPI.orgAdminResetOrgUserPassword(orgID, email, this.state.turnstileToken).then(res => {
      toaster.success(res.data.reset_tip);
      this.toggleResetPW();
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
      if (window.turnstile && this.state.turnstileWidgetId !== null) {
        window.turnstile.reset(this.state.turnstileWidgetId);
        this.setState({ turnstileToken: '' });
      }
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

  setUserInactive = () => {
    const isActive = false;
    this.props.changeStatus(this.props.user.email, isActive);
  };

  handleDropdownOpen = () => {
    this.props.onFreezedItem();
    this.setState({ isDropdownFrozen: true, showMenu: true, highlight: true });
  };

  handleDropdownClose = () => {
    this.props.onUnfreezedItem();
    this.setState({ isDropdownFrozen: false, highlight: false, showMenu: false });
  };

  getMenuItems = () => {
    const items = [
      { key: 'delete', label: gettext('Delete'), onClick: this.toggleDelete },
      { key: 'reset-pwd', label: gettext('ResetPwd'), onClick: this.toggleResetPW },
    ];
    if (this.props.currentTab === 'admins') {
      items.push({ key: 'revoke-admin', label: gettext('Revoke Admin'), onClick: this.toggleRevokeAdmin });
    }
    return items;
  };

  getQuotaTotal = (data) => {
    switch (data) {
      case -1: // failed to fetch quota
        return gettext('Failed');
      case -2:
        return '--';
      default: // data > 0
        return Utils.formatSize({ bytes: data });
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

  toggleConfirmInactiveDialog = () => {
    this.setState({ isConfirmInactiveDialogOpen: !this.state.isConfirmInactiveDialogOpen });
  };

  render() {
    const { highlight, isConfirmInactiveDialogOpen } = this.state;
    let { user } = this.props;
    let href = siteRoot + 'org/useradmin/info/' + encodeURIComponent(user.email) + '/';
    let isOperationMenuShow = (user.email !== username);

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

    const itemName = '<span class="op-target">' + Utils.HTMLescape(user.name) + '</span>';
    const confirmSetUserInactiveMsg = gettext('Are you sure you want to set {user_placeholder} inactive?').replace('{user_placeholder}', itemName);

    return (
      <>
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
              operationBeforeSelect={user.is_active ? this.toggleConfirmInactiveDialog : undefined}
            />
          </td>
          <td>{`${Utils.formatSize({ bytes: user.quota_usage })} / ${this.getQuotaTotal(user.quota_total)}`}</td>
          <td>
            {user.ctime} /
            <br />
            {user.last_login ? user.last_login : '--'}
          </td>
          <td className="text-center cursor-pointer">
            {(this.state.showMenu || this.state.isDropdownFrozen) && isOperationMenuShow && (
              <CustomDropdown
                items={this.getMenuItems()}
                triggerClassName="op-icon"
                freezeItem={this.handleDropdownOpen}
                unfreezeItem={this.handleDropdownClose}
              />
            )}
          </td>
        </tr>
        {isConfirmInactiveDialogOpen &&
          <CommonOperationConfirmationDialog
            title={gettext('Set user inactive')}
            message={confirmSetUserInactiveMsg}
            executeOperation={this.setUserInactive}
            confirmBtnText={gettext('Set')}
            toggleDialog={this.toggleConfirmInactiveDialog}
          />
        }
        {this.state.isResetPasswordDialogOpen &&
          <Modal isOpen={true} toggle={this.toggleResetPW} onOpened={this.renderTurnstileWidget}>
            <SeahubModalHeader toggle={this.toggleResetPW}>{gettext('Reset Password')}</SeahubModalHeader>
            <ModalBody>
              <p>{gettext('Are you sure you want to reset the password of {user_placeholder}?').replace('{user_placeholder}', user.name)}</p>
              {window.org && window.org.pageOptions && window.org.pageOptions.enableTurnstile && (
                <div ref={this.turnstileRef} className="mt-2"></div>
              )}
            </ModalBody>
            <ModalFooter>
              <Button color="secondary" onClick={this.toggleResetPW}>{gettext('Cancel')}</Button>
              <Button color="primary" onClick={this.executeResetPW}>{gettext('Submit')}</Button>
            </ModalFooter>
          </Modal>
        }
      </>
    );
  }
}

UserItem.propTypes = propTypes;

export default UserItem;
