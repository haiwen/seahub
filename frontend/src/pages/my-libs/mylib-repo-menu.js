import React from 'react';
import PropTypes from 'prop-types';
import { Dropdown, DropdownMenu, DropdownToggle, DropdownItem } from 'reactstrap';
import { gettext, folderPermEnabled, enableRepoSnapshotLabel, enableResetEncryptedRepoPassword, isEmailConfigured } from '../../utils/constants';

const propTypes = {
  isPC: PropTypes.bool,
  repo: PropTypes.object.isRequired,
  onFreezedItem: PropTypes.func.isRequired,
  onUnfreezedItem: PropTypes.func.isRequired,
  onMenuItemClick: PropTypes.func.isRequired,
};

class MylibRepoMenu extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isItemMenuShow: false,
    };
  }

  onMenuItemClick = (e) => {
    let operation = e.target.dataset.toggle;
    this.props.onMenuItemClick(operation);
  }

  onDropdownToggleClick = (e) => {
    this.toggleOperationMenu(e);
  }

  toggleOperationMenu = (e) => {
    let dataset = e.target ? e.target.dataset : null;
    if (dataset && dataset.toggle && dataset.toggle === 'Rename') {
      this.setState({isItemMenuShow: !this.state.isItemMenuShow});
      return;
    }
    
    this.setState(
      {isItemMenuShow: !this.state.isItemMenuShow},
      () => {
        if (this.state.isItemMenuShow) {
          this.props.onFreezedItem();
        } else {
          this.props.onUnfreezedItem();
        }
      }
    );
  }

  generatorOperations = () => {
    let repo = this.props.repo;
    let showResetPasswordMenuItem = repo.encrypted && enableResetEncryptedRepoPassword && isEmailConfigured;
    let operations = ['Rename', 'Transfer', 'History Setting'];
    if (repo.encrypted) {
      operations.push('Change Password');
    }
    if (showResetPasswordMenuItem) {
      operations.push('Reset Password')
    }
    if (folderPermEnabled) {
      operations.push('Folder Permission');
    }
    operations.push('Details');
    if (this.props.isPC && enableRepoSnapshotLabel) {
      operations.push('Label current state');
    }
    return operations;
  }

  translateOperations = (item) => {
    let translateResult = '';
    switch(item) {
      case 'Share':
        translateResult = gettext('Share');
        break;
      case 'Delete':
        translateResult = gettext('Delete');
        break;
      case 'Rename':
        translateResult = gettext('Rename');
        break;
      case 'Transfer':
        translateResult = gettext('Transfer');
        break;
      case 'History Setting':
        translateResult = gettext('History Setting');
        break;
      case 'Change Password':
        translateResult = gettext('Change Password');
        break;
      case 'Reset Password':
        translateResult = gettext('Reset Password');
        break;
      case 'Folder Permission':
        translateResult = gettext('Folder Permission');
        break;
      case 'Details':
        translateResult = gettext('Details');
        break;
      case 'Label current state':
        translateResult = gettext('Label current state');
        break;
      default:
        break;
    }

    return translateResult;
  }

  render() {
    let operations = this.generatorOperations();

    // pc menu
    if (this.props.isPC) {
      return (
        <Dropdown isOpen={this.state.isItemMenuShow} toggle={this.toggleOperationMenu}>
          <DropdownToggle 
            tag="i"
            className="sf-dropdown-toggle sf2-icon-caret-down"
            title={gettext('More Operations')}
            // onClick={this.clickOperationMenuToggle}
            data-toggle="dropdown" 
            aria-expanded={this.state.isItemMenuShow}
          />
          <DropdownMenu>
            {operations.map((item, index )=> {
              return (<DropdownItem key={index} data-toggle={item} onClick={this.onMenuItemClick}>{this.translateOperations(item)}</DropdownItem>);
            })}
          </DropdownMenu>
        </Dropdown>
      )
    }

    // mobile menu
    operations.unshift('Share');
    operations.unshift('Delete');

    return (
      <Dropdown isOpen={this.state.isItemMenuShow} toggle={this.toggleOperationMenu}>
        <DropdownToggle 
          tag="i"
          className="sf-dropdown-toggle sf2-icon-caret-down ml-0"
          title={gettext('More Operations')}
          // onClick={this.clickOperationMenuToggle}
          data-toggle="dropdown" 
          aria-expanded={this.state.isItemMenuShow}
        />
        <div className={`${this.state.isItemMenuShow ? '' : 'd-none'}`} onClick={this.toggleOperationMenu}>
          <div className="mobile-operation-menu-bg-layer"></div>
          <div className="mobile-operation-menu">
            {operations.map((item, index) => {
              return (<DropdownItem key={index} className="mobile-menu-item" data-toggle={item} onClick={this.onMenuItemClick}>{this.translateOperations(item)}</DropdownItem>);
            })}
          </div>
        </div>
      </Dropdown>
    );
  }
}

MylibRepoMenu.propTypes = propTypes;

export default MylibRepoMenu;
