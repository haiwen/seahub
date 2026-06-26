import React from 'react';
import PropTypes from 'prop-types';
import { DropdownItem } from 'reactstrap';
import { gettext, isPro, folderPermEnabled, enableRepoSnapshotLabel, enableResetEncryptedRepoPassword, isEmailConfigured, enableMultipleOfficeSuite, enableStorageClasses } from '../utils/constants';
import { Utils } from '../utils/utils';
import MobileItemMenu from '../components/mobile-item-menu';
import Icon from './icon';
import Tooltip from './tooltip';
import CustomDropdown from './dropdown';

const propTypes = {
  isPC: PropTypes.bool,
  isLibView: PropTypes.bool,
  isDepartmentRepo: PropTypes.bool,
  menuContainer: PropTypes.string,
  repo: PropTypes.object.isRequired,
  isStarred: PropTypes.bool,
  onFreezedItem: PropTypes.func,
  onUnfreezedItem: PropTypes.func,
  onMenuItemClick: PropTypes.func.isRequired,
};

class LibraryOperationMenu extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isItemMenuShow: false,
    };
  }

  onMenuItemClick = (e) => {
    const operation = Utils.getEventData(e, 'toggle');
    this.props.onMenuItemClick(e, operation);
  };

  toggleOperationMenu = (e) => {
    const { isLibView } = this.props;
    if (isLibView) {
      this.setState({ isItemMenuShow: !this.state.isItemMenuShow });
      return;
    }

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


  generatorOperations = () => {
    let repo = this.props.repo;
    let showResetPasswordMenuItem = isPro && repo.encrypted && enableResetEncryptedRepoPassword && isEmailConfigured;
    let operations = ['Rename'];
    if (this.props.isStarred) {
      operations.push('Unstar');
    } else {
      operations.push('Star');
    }
    operations.push('Transfer');
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
    const { isDepartmentRepo, repo } = this.props;
    const operations = [];
    operations.push('API Token');

    // Archive/Unarchive operation - show for both personal and department repos when storage classes is enabled
    if (enableStorageClasses && isPro) {
      const archiveStatus = repo.archive_status;
      if (!archiveStatus || archiveStatus === 'archived') {
        operations.push('Archive');
      }
    }

    operations.push('Webhooks');

    if (isDepartmentRepo) {
      return operations;
    }

    if (this.props.isPC && enableRepoSnapshotLabel) {
      operations.push('Label Current State');
    }
    if (enableMultipleOfficeSuite && isPro) {
      operations.push('Office Suite');
    }
    return operations;
  };

  buildMenuItems = (operations, advancedOperations) => {
    return operations.map((item) => {
      if (item === 'Divider') {
        return item;
      }

      if (item === 'Advanced') {
        return {
          key: 'Advanced',
          label: this.translateOperations(item),
          children: advancedOperations.map((advancedItem) => ({
            key: advancedItem,
            label: this.translateOperations(advancedItem),
            onClick: (e) => this.props.onMenuItemClick(e, advancedItem),
          })),
        };
      }

      return {
        key: item,
        label: this.translateOperations(item),
        onClick: (e) => this.props.onMenuItemClick(e, item),
      };
    });
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
      case 'Folder Permission':
        translateResult = gettext('Folder Permission');
        break;
      case 'Label Current State':
        translateResult = gettext('Label Current State');
        break;
      case 'API Token':
        translateResult = 'API Token'; // translation is not needed here
        break;
      case 'Webhooks':
        translateResult = 'Webhooks';
        break;
      case 'Share Admin':
        translateResult = gettext('Share Admin');
        break;
      case 'Advanced':
        translateResult = gettext('Advanced');
        break;
      case 'Office Suite':
        translateResult = gettext('Office Suite');
        break;
      case 'Archive':
        translateResult = this.props.repo && this.props.repo.archive_status === 'archived' ? gettext('Unarchive') : gettext('Archive');
        break;
      default:
        break;
    }

    return translateResult;
  };

  renderCustomTrigger = (isOpen) => {
    const { isLibView } = this.props;
    return (
      <>
        <Icon symbol="more-level" />
        {!isOpen && (
          <Tooltip target={isLibView ? 'library-more-operations-btn' : 'more-operations-btn'}>
            {isLibView ? gettext('More') : gettext('More operations')}
          </Tooltip>
        )}
      </>
    );
  };

  render() {
    let operations = this.generatorOperations();
    const advancedOperations = this.getAdvancedOperations();
    const menuItems = this.buildMenuItems(operations, advancedOperations);

    const { children, isLibView, menuContainer } = this.props;

    // pc menu
    if (this.props.isPC) {
      return (
        <CustomDropdown
          items={menuItems}
          className={isLibView ? 'd-block' : ''}
          target={isLibView ? 'library-more-operations-btn' : 'more-operations-btn'}
          placement={isLibView ? 'end' : 'down'}
          trigger={isLibView ? children : this.renderCustomTrigger}
          triggerClassName={isLibView ? 'dir-others-item' : 'op-icon'}
          menuProps={{ container: menuContainer || (isLibView ? 'body' : '') }}
          freezeItem={this.props.onFreezedItem}
          unfreezeItem={this.props.onUnfreezedItem}
        />
      );
    }

    // mobile menu
    operations.pop(); // removed the last item 'Advanced'
    operations.unshift('Delete');
    operations.unshift('Share');

    return (
      <MobileItemMenu isOpen={this.state.isItemMenuShow} toggle={this.toggleOperationMenu}>
        {operations.filter(item => item != 'Divider').map((item, index) => {
          return (<DropdownItem key={index} className="mobile-menu-item" data-toggle={item} onClick={this.onMenuItemClick}>{this.translateOperations(item)}</DropdownItem>);
        })}
      </MobileItemMenu>
    );
  }
}

LibraryOperationMenu.propTypes = propTypes;

export default LibraryOperationMenu;
