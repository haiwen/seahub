import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { Dropdown, DropdownMenu, DropdownToggle, DropdownItem } from 'reactstrap';
import { Link, navigate } from '@gatsbyjs/reach-router';
import { Utils } from '../../utils/utils';
import { gettext, siteRoot, isPro, username, folderPermEnabled, isSystemStaff, enableResetEncryptedRepoPassword, isEmailConfigured } from '../../utils/constants';
import ModalPortal from '../../components/modal-portal';
import ShareDialog from '../../components/dialog/share-dialog';
import LibSubFolderPermissionDialog from '../../components/dialog/lib-sub-folder-permission-dialog';
import DeleteRepoDialog from '../../components/dialog/delete-repo-dialog';
import ChangeRepoPasswordDialog from '../../components/dialog/change-repo-password-dialog';
import ResetEncryptedRepoPasswordDialog from '../../components/dialog/reset-encrypted-repo-password-dialog';
import Rename from '../rename';
import { seafileAPI } from '../../utils/seafile-api';
import { userAPI } from '../../utils/user-api';
import toaster from '../toast';
import RepoAPITokenDialog from '../dialog/repo-api-token-dialog';
import RepoShareAdminDialog from '../dialog/repo-share-admin-dialog';
import RepoMonitoredIcon from '../../components/repo-monitored-icon';
import { LIST_MODE } from '../dir-view-mode/constants';
import TransferDialog from '../dialog/transfer-dialog';

dayjs.extend(relativeTime);

const propTypes = {
  currentViewMode: PropTypes.string,
  currentGroup: PropTypes.object,
  libraryType: PropTypes.string,
  repo: PropTypes.object.isRequired,
  isItemFreezed: PropTypes.bool.isRequired,
  onFreezedItem: PropTypes.func.isRequired,
  onUnfreezedItem: PropTypes.func.isRequired,
  onItemUnshare: PropTypes.func.isRequired,
  onItemRename: PropTypes.func,
  onItemDelete: PropTypes.func,
  onMonitorRepo: PropTypes.func,
  onContextMenu: PropTypes.func.isRequired,
  onTransferRepo: PropTypes.func
};

class SharedRepoListItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      highlight: false,
      isOperationShow: false,
      isItemMenuShow: false,
      isAdvancedMenuShown: false,
      isShowSharedDialog: false,
      isRenaming: false,
      isStarred: this.props.repo.starred,
      isFolderPermissionDialogOpen: false,
      isDeleteDialogShow: false,
      isAPITokenDialogShow: false,
      isTransferDialogShow: false,
      isRepoShareAdminDialogOpen: false,
      isRepoDeleted: false,
      isChangePasswordDialogShow: false,
      isResetPasswordDialogShow: false,
    };
    this.isDepartmentOwnerGroupMember = false;
  }

  onMouseEnter = () => {
    if (!this.props.isItemFreezed) {
      this.setState({
        highlight: true,
        isOperationShow: true,
      });
    }
  };

  onMouseOver = () => {
    if (!this.props.isItemFreezed) {
      this.setState({
        highlight: true,
        isOperationShow: true,
      });
    }
  };

  onMouseLeave = () => {
    if (!this.props.isItemFreezed) {
      this.setState({
        highlight: false,
        isOperationShow: false,
      });
    }
  };

  clickOperationMenuToggle = (e) => {
    this.toggleOperationMenu(e);
  };

  onDropdownToggleKeyDown = (e) => {
    if (e.key == 'Enter' || e.key == 'Space') {
      this.clickOperationMenuToggle(e);
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
          this.setState({
            highlight: false,
            isOperationShow: false,
          });
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

  getRepoComputeParams = () => {
    const { repo } = this.props;
    const iconUrl = Utils.getLibIconUrl(repo);
    let iconTitle = Utils.getLibIconTitle(repo);
    let libPath = `${siteRoot}library/${repo.repo_id}/${Utils.encodePath(repo.repo_name)}/`;

    return { iconUrl, iconTitle, libPath };
  };

  onMenuItemKeyDown = (e) => {
    if (e.key == 'Enter' || e.key == 'Space') {
      this.onMenuItemClick(e);
    }
  };

  onMenuItemClick = (e) => {
    let operation = e.target.dataset.toggle || e.target.dataset.operation;
    switch (operation) {
      case 'Rename':
        this.onItemRenameToggle();
        break;
      case 'Transfer':
        this.onTransferToggle();
        break;
      case 'Folder Permission':
        this.onItemFolderPermissionToggle();
        break;
      case 'Share':
        this.onItemShare();
        break;
      case 'Unshare':
        this.onItemUnshare();
        break;
      case 'API Token':
        this.onAPITokenToggle();
        break;
      case 'Share Admin':
        this.toggleRepoShareAdminDialog();
        break;
      case 'Change Password':
        this.onChangePasswordToggle();
        break;
      case 'Reset Password':
        this.onResetPasswordToggle();
        break;
      case 'Watch File Changes':
        this.watchFileChanges();
        break;
      case 'Unwatch File Changes':
        this.unwatchFileChanges();
        break;
      // no default
    }
  };

  watchFileChanges = () => {
    const { repo } = this.props;
    seafileAPI.monitorRepo(repo.repo_id).then(() => {
      this.props.onMonitorRepo(repo, true);
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  unwatchFileChanges = () => {
    const { repo } = this.props;
    seafileAPI.unMonitorRepo(repo.repo_id).then(() => {
      this.props.onMonitorRepo(repo, false);
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  onItemRenameToggle = () => {
    this.props.onFreezedItem();
    this.setState({
      isRenaming: !this.state.isRenaming,
      isOperationShow: !this.state.isOperationShow
    });
  };

  onTransferToggle = () => {
    this.setState({ isTransferDialogShow: !this.state.isTransferDialogShow });
  };

  onTransferRepo = (email, reshare) => {
    let repoID = this.props.repo.repo_id;
    let groupID = this.props.currentGroup.id;
    userAPI.depAdminTransferRepo(repoID, groupID, email, reshare).then(res => {
      this.props.onTransferRepo(repoID, groupID, email);
      let message = gettext('Successfully transferred the library.');
      toaster.success(message);
    }).catch(error => {
      if (error.response) {
        toaster.danger(error.response.data.error_msg || gettext('Error'), { duration: 3 });
      } else {
        toaster.danger(gettext('Failed. Please check the network.'), { duration: 3 });
      }
    });
    this.onTransferToggle();
  };

  onRenameConfirm = (name) => {
    this.props.onItemRename(this.props.repo, name);
    this.onRenameCancel();
  };

  onRenameCancel = () => {
    this.props.onUnfreezedItem();
    this.setState({ isRenaming: !this.state.isRenaming });
  };

  onItemFolderPermissionToggle = () => {
    this.setState({ isFolderPermissionDialogOpen: !this.state.isFolderPermissionDialogOpen });
  };

  onItemShare = () => {
    this.setState({ isShowSharedDialog: true });
  };

  onItemUnshare = () => {
    this.props.onItemUnshare(this.props.repo);
  };

  onItemDeleteToggle = () => {
    this.setState({ isDeleteDialogShow: !this.state.isDeleteDialogShow });
  };

  onItemDelete = () => {
    const { currentGroup, repo } = this.props;
    if (!currentGroup) { // repo can not be deleted in share all module
      return;
    }

    const groupID = currentGroup.id;

    seafileAPI.deleteGroupOwnedLibrary(groupID, repo.repo_id).then(() => {

      this.setState({
        isRepoDeleted: true,
        isDeleteDialogShow: false,
      });

      this.props.onItemDelete(repo);
      let name = repo.repo_name;
      var msg = gettext('Successfully deleted {name}.').replace('{name}', name);
      toaster.success(msg);
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      if (errMessage === gettext('Error')) {
        let name = repo.repo_name;
        errMessage = gettext('Failed to delete {name}.').replace('{name}', name);
      }
      toaster.danger(errMessage);

      this.setState({ isRepoDeleted: false });
    });
  };

  toggleShareDialog = () => {
    this.setState({ isShowSharedDialog: false });
  };

  toggleRepoShareAdminDialog = () => {
    this.setState({ isRepoShareAdminDialogOpen: !this.state.isRepoShareAdminDialogOpen });
  };

  onAPITokenToggle = () => {
    this.setState({ isAPITokenDialogShow: !this.state.isAPITokenDialogShow });
  };

  onChangePasswordToggle = () => {
    this.setState({ isChangePasswordDialogShow: !this.state.isChangePasswordDialogShow });
  };

  onResetPasswordToggle = () => {
    this.setState({ isResetPasswordDialogShow: !this.state.isResetPasswordDialogShow });
  };

  translateMenuItem = (menuItem) => {
    let translateResult = '';
    switch (menuItem) {
      case 'Rename':
        translateResult = gettext('Rename');
        break;
      case 'Transfer':
        translateResult = gettext('Transfer');
        break;
      case 'Folder Permission':
        translateResult = gettext('Folder Permission');
        break;
      case 'Unshare':
        translateResult = gettext('Unshare');
        break;
      case 'Share':
        translateResult = gettext('Share');
        break;
      case 'Share Admin':
        translateResult = gettext('Share Admin');
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
      case 'API Token':
        translateResult = 'API Token'; // translation is not needed here
        break;
      case 'Advanced':
        translateResult = gettext('Advanced');
        break;
      case 'SeaTable integration':
        translateResult = gettext('SeaTable integration');
        break;
      default:
        break;
    }
    return translateResult;
  };

  getAdvancedOperations = () => {
    const operations = [];
    operations.push('API Token');
    return operations;
  };

  generatorOperations = () => {
    let { repo, currentGroup } = this.props;
    // todo this have a bug; use current api is not return admins param;
    let isStaff = currentGroup && currentGroup.admins && currentGroup.admins.indexOf(username) > -1; // for group repo list;
    let isRepoOwner = repo.owner_email === username;
    let isAdmin = repo.is_admin;
    let operations = [];
    if (isPro) {
      if (repo.owner_email.indexOf('@seafile_group') != -1) {
        // is group admin
        if (isStaff) {
          if (repo.owner_email == currentGroup.id + '@seafile_group') {
            this.isDepartmentOwnerGroupMember = true;
            operations = ['Rename', 'Transfer'];
            if (folderPermEnabled) {
              operations.push('Folder Permission');
            }
            operations.push('Share Admin', 'Divider');
            if (repo.encrypted) {
              operations.push('Change Password');
            }
            if (repo.encrypted && enableResetEncryptedRepoPassword && isEmailConfigured) {
              operations.push('Reset Password');
            }
            if (repo.permission == 'r' || repo.permission == 'rw') {
              const monitorOp = repo.monitored ? 'Unwatch File Changes' : 'Watch File Changes';
              operations.push(monitorOp);
            }
            if (Utils.isDesktop()) {
              operations.push('Divider', 'Advanced');
            }
            return operations;
          } else {
            operations.push('Unshare');
          }
        }
      } else {
        if (isRepoOwner || isAdmin) {
          operations.push('Share');
        }
        if (isStaff || isRepoOwner || isAdmin) {
          operations.push('Unshare');
        }
      }
      if (repo.permission == 'r' || repo.permission == 'rw') {
        const monitorOp = repo.monitored ? 'Unwatch File Changes' : 'Watch File Changes';
        operations.push(monitorOp);
      }
    } else {
      if (isRepoOwner) {
        operations.push('Share');
      }
      if (isStaff || isRepoOwner) {
        operations.push('Unshare');
      }
    }
    return operations;
  };

  generatorMobileMenu = () => {
    let operations = [];
    if (this.props.libraryType && this.props.libraryType === 'public') {
      let isRepoOwner = this.props.repo.owner_email === username;
      if (isSystemStaff || isRepoOwner) {
        operations.push('Unshare');
      }
    } else {
      operations = this.generatorOperations().filter(item => item != 'Divider');
      if (this.isDepartmentOwnerGroupMember) {
        operations.unshift('Unshare');
        operations.unshift('Share');
      }
    }

    if (!operations.length) {
      return null;
    }
    return (
      <Dropdown isOpen={this.state.isItemMenuShow} toggle={this.toggleOperationMenu}>
        <DropdownToggle
          tag="i"
          className="sf-dropdown-toggle sf3-font sf3-font-more-vertical ml-0"
          title={gettext('More operations')}
          aria-label={gettext('More operations')}
          data-toggle="dropdown"
          aria-expanded={this.state.isItemMenuShow}
          onClick={this.clickOperationMenuToggle}
        />
        <div className={`${this.state.isItemMenuShow ? '' : 'd-none'}`} onClick={this.toggleOperationMenu}>
          <div className="mobile-operation-menu-bg-layer"></div>
          <div className="mobile-operation-menu">
            {operations.map((item, index) => {
              return (
                <DropdownItem key={index} data-toggle={item} onClick={this.onMenuItemClick}>{this.translateMenuItem(item)}</DropdownItem>
              );
            })}
          </div>
        </div>
      </Dropdown>
    );
  };

  generatorPCMenu = () => {
    let operations = [];
    if (this.props.libraryType && this.props.libraryType === 'public') {
      let isRepoOwner = this.props.repo.owner_email === username;
      if (isSystemStaff || isRepoOwner) {
        operations.push('Unshare');
      }
    } else {
      operations = this.generatorOperations();
    }
    const shareOperation = <i className="op-icon sf3-font-share sf3-font" title={gettext('Share')} role="button" aria-label={gettext('Share')} onClick={this.onItemShare}></i>;
    const unshareOperation = <i className="op-icon sf2-icon-x3" title={gettext('Unshare')} role="button" aria-label={gettext('Unshare')} onClick={this.onItemUnshare}></i>;
    const deleteOperation = <i className="op-icon sf3-font-delete1 sf3-font" title={gettext('Delete')} role="button" aria-label={gettext('Delete')} onClick={this.onItemDeleteToggle}></i>;

    if (this.isDepartmentOwnerGroupMember) {
      const advancedOperations = this.getAdvancedOperations();
      return (
        <Fragment>
          {shareOperation}
          {deleteOperation}
          <Dropdown isOpen={this.state.isItemMenuShow} toggle={this.toggleOperationMenu}>
            <DropdownToggle
              tag="i"
              role="button"
              tabIndex="0"
              className="sf-dropdown-toggle sf3-font-more sf3-font"
              title={gettext('More operations')}
              aria-label={gettext('More operations')}
              data-toggle="dropdown"
              aria-expanded={this.state.isItemMenuShow}
              aria-haspopup={true}
              style={{ 'minWidth': '0' }}
              onClick={this.clickOperationMenuToggle}
              onKeyDown={this.onDropdownToggleKeyDown}
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
                        {this.translateMenuItem(item)}
                        <i className="sf3-font-down sf3-font rotate-270"></i>
                      </DropdownToggle>
                      <DropdownMenu>
                        {advancedOperations.map((item, index) => {
                          return (<DropdownItem key={index} data-toggle={item} onClick={this.onMenuItemClick} onKeyDown={this.onMenuItemKeyDown}>{this.translateMenuItem(item)}</DropdownItem>);
                        })}
                      </DropdownMenu>
                    </Dropdown>
                  );
                } else {
                  return (<DropdownItem key={index} data-toggle={item} onClick={this.onMenuItemClick} onKeyDown={this.onMenuItemKeyDown}>{this.translateMenuItem(item)}</DropdownItem>);
                }
              })}
            </DropdownMenu>
          </Dropdown>
        </Fragment>
      );
    } else {
      return (
        <Fragment>
          {operations.map(item => {
            switch (item) {
              case 'Share':
                return <Fragment key={item}>{shareOperation}</Fragment>;
              case 'Unshare':
                return <Fragment key={item}>{unshareOperation}</Fragment>;
              case 'Watch File Changes':
              case 'Unwatch File Changes':
                return (
                  <Dropdown isOpen={this.state.isItemMenuShow} toggle={this.toggleOperationMenu} key={item}>
                    <DropdownToggle
                      tag="i"
                      role="button"
                      tabIndex="0"
                      className="sf-dropdown-toggle sf3-font-more sf3-font"
                      title={gettext('More operations')}
                      aria-label={gettext('More operations')}
                      data-toggle="dropdown"
                      aria-expanded={this.state.isItemMenuShow}
                      aria-haspopup={true}
                      style={{ 'minWidth': '0' }}
                      onClick={this.clickOperationMenuToggle}
                      onKeyDown={this.onDropdownToggleKeyDown}
                    />
                    <DropdownMenu>
                      {[item].map((item, index) => {
                        return <DropdownItem key={index} data-toggle={item} onClick={this.onMenuItemClick} onKeyDown={this.onMenuItemKeyDown}>{this.translateMenuItem(item)}</DropdownItem>;
                      })}
                    </DropdownMenu>
                  </Dropdown>
                );
              // no default
              default:
                return null;
            }
          })}
        </Fragment>
      );
    }
  };

  onToggleStarRepo = (e) => {
    e.preventDefault();
    const { repo_name: repoName } = this.props.repo;
    if (this.state.isStarred) {
      seafileAPI.unstarItem(this.props.repo.repo_id, '/').then(() => {
        this.setState({ isStarred: !this.state.isStarred });
        const msg = gettext('Successfully unstarred {library_name_placeholder}.')
          .replace('{library_name_placeholder}', repoName);
        toaster.success(msg);
      }).catch(error => {
        let errMessage = Utils.getErrorMsg(error);
        toaster.danger(errMessage);
      });
    } else {
      seafileAPI.starItem(this.props.repo.repo_id, '/').then(() => {
        this.setState({ isStarred: !this.state.isStarred });
        const msg = gettext('Successfully starred {library_name_placeholder}.')
          .replace('{library_name_placeholder}', repoName);
        toaster.success(msg);
      }).catch(error => {
        let errMessage = Utils.getErrorMsg(error);
        toaster.danger(errMessage);
      });
    }
  };

  handleContextMenu = (e) => {
    this.props.onContextMenu(e, this.props.repo);
  };

  renderPCUI = () => {
    const { isStarred } = this.state;
    let { iconUrl, iconTitle, libPath } = this.getRepoComputeParams();
    const { repo, currentViewMode } = this.props;
    return currentViewMode == LIST_MODE ? (
      <tr
        className={this.state.highlight ? 'tr-highlight' : ''}
        onMouseEnter={this.onMouseEnter}
        onMouseOver={this.onMouseOver}
        onMouseLeave={this.onMouseLeave}
        onFocus={this.onMouseEnter}
        onContextMenu={this.handleContextMenu}
      >
        <td className="text-center">
          <i
            role="button"
            title={this.state.isStarred ? gettext('Unstar') : gettext('Star')}
            aria-label={this.state.isStarred ? gettext('Unstar') : gettext('Star')}
            onClick={this.onToggleStarRepo}
            className={`op-icon m-0 ${this.state.isStarred ? 'sf3-font-star' : 'sf3-font-star-empty'} sf3-font`}
          >
          </i>
        </td>
        <td><img src={iconUrl} title={iconTitle} alt={iconTitle} width="24" /></td>
        <td>
          {this.state.isRenaming ?
            <Rename name={repo.repo_name} onRenameConfirm={this.onRenameConfirm} onRenameCancel={this.onRenameCancel}/> :
            <Fragment>
              <Link to={libPath}>{repo.repo_name}</Link>
              {repo.monitored && <RepoMonitoredIcon repoID={repo.repo_id} className="ml-1 op-icon" />}
            </Fragment>
          }
        </td>
        <td>{this.state.isOperationShow && this.generatorPCMenu()}</td>
        <td>{repo.size}</td>
        <td title={dayjs(repo.last_modified).format('dddd, MMMM D, YYYY h:mm:ss A')}>{dayjs(repo.last_modified).fromNow()}</td>
        <td title={repo.owner_contact_email}>{repo.owner_name}</td>
      </tr>
    ) : (
      <div
        className="library-grid-item px-3 d-flex justify-content-between align-items-center"
        onMouseEnter={this.onMouseEnter}
        onMouseLeave={this.onMouseLeave}
        onFocus={this.onMouseEnter}
        onContextMenu={this.handleContextMenu}
      >
        <div className="d-flex align-items-center text-truncate">
          <img src={iconUrl} title={iconTitle} alt={iconTitle} width="36" className="mr-2" />
          {this.state.isRenaming ?
            <Rename name={repo.repo_name} onRenameConfirm={this.onRenameConfirm} onRenameCancel={this.onRenameCancel} /> :
            <Fragment>
              <Link to={libPath} className="library-name text-truncate" title={repo.repo_name}>{repo.repo_name}</Link>
              {isStarred &&
                <i
                  role="button"
                  title={gettext('Unstar')}
                  aria-label={gettext('Unstar')}
                  onClick={this.onToggleStarRepo}
                  className='op-icon library-grid-item-icon sf3-font-star sf3-font'
                >
                </i>
              }
              {repo.monitored && <RepoMonitoredIcon repoID={repo.repo_id} className="op-icon library-grid-item-icon" />}
            </Fragment>
          }
        </div>
        <div className="flex-shrink-0">
          {this.state.isOperationShow && this.generatorPCMenu()}
        </div>
      </div>
    );
  };

  visitRepo = () => {
    if (!this.state.isRenaming) {
      navigate(this.repoURL);
    }
  };

  renderMobileUI = () => {
    let { iconUrl, iconTitle, libPath } = this.getRepoComputeParams();
    let { repo } = this.props;
    this.repoURL = libPath;
    return (
      <Fragment>
        <tr className={this.state.highlight ? 'tr-highlight' : ''} onMouseEnter={this.onMouseEnter} onMouseOver={this.onMouseOver} onMouseLeave={this.onMouseLeave}>
          <td onClick={this.visitRepo}><img src={iconUrl} title={iconTitle} width="24" alt={iconTitle}/></td>
          <td onClick={this.visitRepo}>
            {this.state.isRenaming ?
              <Rename name={repo.repo_name} onRenameConfirm={this.onRenameConfirm} onRenameCancel={this.onRenameCancel} /> :
              <Fragment>
                <Link to={libPath}>{repo.repo_name}</Link>
                {repo.monitored && <RepoMonitoredIcon repoID={repo.repo_id} className="ml-1 op-icon" />}
              </Fragment>
            }
            <br />
            <span className="item-meta-info" title={repo.owner_contact_email}>{repo.owner_name}</span>
            <span className="item-meta-info">{repo.size}</span>
            <span className="item-meta-info" title={dayjs(repo.last_modified).format('dddd, MMMM D, YYYY h:mm:ss A')}>{dayjs(repo.last_modified).fromNow()}</span>
          </td>
          <td>{this.generatorMobileMenu()}</td>
        </tr>
      </Fragment>
    );
  };

  render() {
    let { repo } = this.props;
    let isGroupOwnedRepo = repo.owner_email.indexOf('@seafile_group') > -1;
    return (
      <Fragment>
        {Utils.isDesktop() ? this.renderPCUI() : this.renderMobileUI()}
        {this.state.isShowSharedDialog && (
          <ModalPortal>
            <ShareDialog
              itemType={'library'}
              itemName={repo.repo_name}
              itemPath={'/'}
              repoID={repo.repo_id}
              repo={repo}
              repoEncrypted={repo.encrypted}
              enableDirPrivateShare={true}
              userPerm={repo.permission}
              isAdmin={repo.is_admin}
              isGroupOwnedRepo={isGroupOwnedRepo}
              toggleDialog={this.toggleShareDialog}
            />
          </ModalPortal>
        )}
        {this.state.isFolderPermissionDialogOpen && (
          <ModalPortal>
            <LibSubFolderPermissionDialog
              toggleDialog={this.onItemFolderPermissionToggle}
              repoID={repo.repo_id}
              repoName={repo.repo_name}
              isDepartmentRepo={true}
            />
          </ModalPortal>
        )}
        {this.state.isDeleteDialogShow &&
          <ModalPortal>
            <DeleteRepoDialog
              repo={this.props.repo}
              isRepoDeleted={this.state.isRepoDeleted}
              onDeleteRepo={this.onItemDelete}
              toggle={this.onItemDeleteToggle}
              isGetShare={true}
            />
          </ModalPortal>
        }
        {this.state.isAPITokenDialogShow && (
          <ModalPortal>
            <RepoAPITokenDialog
              repo={repo}
              onRepoAPITokenToggle={this.onAPITokenToggle}
            />
          </ModalPortal>
        )}
        {this.state.isRepoShareAdminDialogOpen && (
          <ModalPortal>
            <RepoShareAdminDialog
              repo={repo}
              toggleDialog={this.toggleRepoShareAdminDialog}
            />
          </ModalPortal>
        )}
        {this.state.isChangePasswordDialogShow && (
          <ModalPortal>
            <ChangeRepoPasswordDialog
              repoID={repo.repo_id}
              repoName={repo.repo_name}
              toggleDialog={this.onChangePasswordToggle}
            />
          </ModalPortal>
        )}
        {this.state.isResetPasswordDialogShow && (
          <ModalPortal>
            <ResetEncryptedRepoPasswordDialog
              repoID={repo.repo_id}
              toggleDialog={this.onResetPasswordToggle}
            />
          </ModalPortal>
        )}
        {this.state.isTransferDialogShow && (
          <ModalPortal>
            <TransferDialog
              itemName={repo.repo_name}
              onTransferRepo={this.onTransferRepo}
              canTransferToDept={true}
              toggleDialog={this.onTransferToggle}
              isDepAdminTransfer={true}
            />
          </ModalPortal>
        )}
      </Fragment>
    );
  }
}

SharedRepoListItem.propTypes = propTypes;

export default SharedRepoListItem;
