import React from 'react';
import PropTypes from 'prop-types';
import { Dropdown, DropdownMenu, DropdownToggle, DropdownItem } from 'reactstrap';
import { gettext, isPro, folderPermEnabled, enableRepoSnapshotLabel, enableResetEncryptedRepoPassword, isEmailConfigured, enableMultipleOfficeSuite } from '../../utils/constants';
import { Utils } from '../../utils/utils';

const propTypes = {
  isPC: PropTypes.bool,
  repo: PropTypes.object.isRequired,
  isStarred: PropTypes.bool,
  onFreezedItem: PropTypes.func.isRequired,
  onUnfreezedItem: PropTypes.func.isRequired,
  onMenuItemClick: PropTypes.func.isRequired,
};

class MylibRepoMenu extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isItemMenuShow: false,
      isAdvancedMenuShown: false
    };
  }

  onMenuItemClick = (e) => {
    let operation = Utils.getEventData(e, 'toggle');
    this.props.onMenuItemClick(operation);
  };

  onMenuItemKeyDown = (e) => {
    if (e.key == 'Enter' || e.key == 'Space') {
      this.onMenuItemClick(e);
    }
  };

  onDropdownToggleClick = (e) => {
    this.toggleOperationMenu(e);
  };

  onDropdownToggleKeyDown = (e) => {
    if (e.key == 'Enter' || e.key == 'Space') {
      this.onDropdownToggleClick(e);
    }
  };

  toggleOperationMenu = (e) => {
    let dataset = e.target ? e.target.dataset : null;
    if (dataset && dataset.toggle && dataset.toggle === 'Rename') {
      this.setState({ isItemMenuShow: !this.state.isItemMenuShow });
      return;
    }

    this.setState(
      { isItemMenuShow: !this.state.isItemMenuShow },
      () => {
        if (this.state.isItemMenuShow) {
          this.props.onFreezedItem();
        } else {
          this.props.onUnfreezedItem();
        }
      }
    );
  };

  toggleAdvancedMenuShown = (e) => {
    this.setState({ isAdvancedMenuShown: true });
  };

  toggleAdvancedMenu = (e) => {
    e.stopPropagation();
    this.setState({ isAdvancedMenuShown: !this.state.isAdvancedMenuShown }, () => {
      this.toggleOperationMenu(e);
    });
  };

  onDropDownMouseMove = (e) => {
    if (this.state.isAdvancedMenuShown && e.target && e.target.className === 'dropdown-item') {
      this.setState({
        isAdvancedMenuShown: false
      });
    }
  };

  generatorOperations = () => {
    let repo = this.props.repo;
    let showResetPasswordMenuItem = isPro && repo.encrypted && enableResetEncryptedRepoPassword && isEmailConfigured;
    let operations = ['Rename', 'Transfer'];
    if (folderPermEnabled) {
      operations.push('Folder Permission');
    }
    operations.push('Share Admin', 'Divider');

    if (repo.encrypted) {
      operations.push('Change Password');
    }
    if (showResetPasswordMenuItem) {
      operations.push('Reset Password');
    }

    if (isPro) {
      const monitorOp = repo.monitored ? 'Unwatch File Changes' : 'Watch File Changes';
      operations.push(monitorOp);
    }

    operations.push('Divider', 'Advanced');
    // Remove adjacent excess 'Divider'
    for (let i = 0; i < operations.length; i++) {
      if (operations[i] === 'Divider' && operations[i + 1] === 'Divider') {
        operations.splice(i, 1);
        i--;
      }
    }
    return operations;
  };

  getAdvancedOperations = () => {
    const operations = [];
    operations.push('API Token');
    if (this.props.isPC && enableRepoSnapshotLabel) {
      operations.push('Label Current State');
    }
    if (enableMultipleOfficeSuite && isPro) {
      operations.push('Office Suite');
    }
    return operations;
  };

  translateOperations = (item) => {
    let translateResult = '';
    switch (item) {
      case 'Star':
        translateResult = gettext('Star');
        break;
      case 'Unstar':
        translateResult = gettext('Unstar');
        break;
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
      case 'Change Password':
        translateResult = gettext('Change Password');
        break;
      case 'Reset Password':
        translateResult = gettext('Reset Password');
        break;
      case 'Watch File Changes':
        translateResult = gettext('Watch File Changes');
        break;
      case 'Unwatch File Changes':
        translateResult = gettext('Unwatch File Changes');
        break;
      case 'Folder Permission':
        translateResult = gettext('Folder Permission');
        break;
      case 'Label Current State':
        translateResult = gettext('Label Current State');
        break;
      case 'API Token':
        translateResult = 'API Token'; // translation is not needed here
        break;
      case 'Share Admin':
        translateResult = gettext('Share Admin');
        break;
      case 'Advanced':
        translateResult = gettext('Advanced');
        break;
      case 'SeaTable integration':
        translateResult = gettext('SeaTable integration');
        break;
      case 'Office Suite':
        translateResult = gettext('Office Suite');
        break;
      default:
        break;
    }

    return translateResult;
  };

  render() {
    let operations = this.generatorOperations();
    const advancedOperations = this.getAdvancedOperations();

    // pc menu
    if (this.props.isPC) {
      return (
        <Dropdown isOpen={this.state.isItemMenuShow} toggle={this.toggleOperationMenu}>
          <DropdownToggle
            tag="i"
            role="button"
            tabIndex="0"
            className="sf-dropdown-toggle sf3-font-more sf3-font"
            title={gettext('More operations')}
            aria-label={gettext('More operations')}
            onClick={this.onDropdownToggleClick}
            onKeyDown={this.onDropdownToggleKeyDown}
            data-toggle="dropdown"
          />
          <DropdownMenu onMouseMove={this.onDropDownMouseMove}>
            {operations.map((item, index) => {
              if (item == 'Divider') {
                return <DropdownItem key={index} divider />;
              } else if (item == 'Advanced') {
                return (
                  <Dropdown
                    key={index}
                    direction="right"
                    className="w-100"
                    isOpen={this.state.isAdvancedMenuShown}
                    toggle={this.toggleAdvancedMenu}
                    onMouseMove={(e) => {e.stopPropagation();}}
                  >
                    <DropdownToggle
                      tag="span"
                      className="dropdown-item font-weight-normal rounded-0 d-flex justify-content-between align-items-center pr-2"
                      onMouseEnter={this.toggleAdvancedMenuShown}
                    >
                      {this.translateOperations(item)}
                      <i className="sf3-font-down sf3-font rotate-270"></i>
                    </DropdownToggle>
                    <DropdownMenu>
                      {advancedOperations.map((item, index) => {
                        return (<DropdownItem key={index} data-toggle={item} onClick={this.onMenuItemClick} onKeyDown={this.onMenuItemKeyDown}>{this.translateOperations(item)}</DropdownItem>);
                      })}
                    </DropdownMenu>
                  </Dropdown>
                );
              } else {
                return (<DropdownItem key={index} data-toggle={item} onClick={this.onMenuItemClick} onKeyDown={this.onMenuItemKeyDown}>{this.translateOperations(item)}</DropdownItem>);
              }
            })}
          </DropdownMenu>
        </Dropdown>
      );
    }

    // mobile menu
    operations.pop(); // removed the last item 'Advanced'
    operations.unshift('Delete');
    operations.unshift('Share');
    this.props.isStarred ? operations.unshift('Unstar') : operations.unshift('Star');

    return (
      <Dropdown isOpen={this.state.isItemMenuShow} toggle={this.toggleOperationMenu}>
        <DropdownToggle
          tag="i"
          className="sf-dropdown-toggle sf3-font sf3-font-more-vertical ml-0"
          title={gettext('More operations')}
          aria-label={gettext('More operations')}
          data-toggle="dropdown"
          aria-expanded={this.state.isItemMenuShow}
        />
        <DropdownMenu
          container={document.body}
          className="mobile-dropdown-menu"
        >
          <div className="mobile-operation-menu-bg-layer"></div>
          <div className="mobile-operation-menu">
            {operations.map((item, index) => {
              if (item != 'Divider') {
                return (<DropdownItem key={index} className="mobile-menu-item" data-toggle={item} onClick={this.onMenuItemClick}>{this.translateOperations(item)}</DropdownItem>);
              }
              return null;
            })}
          </div>
        </DropdownMenu>
      </Dropdown>
    );
  }
}

MylibRepoMenu.propTypes = propTypes;

export default MylibRepoMenu;
