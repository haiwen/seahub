import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import { Dropdown, DropdownMenu, DropdownToggle, DropdownItem } from 'reactstrap';
import { Link } from '@reach/router';
import { Utils } from '../../utils/utils';
import { gettext, siteRoot, isPro, username, folderPermEnabled, isSystemStaff } from '../../utils/constants';
import ModalPotal from '../../components/modal-portal';
import ShareDialog from '../../components/dialog/share-dialog';
import Rename from '../rename';

const propTypes = {
  currentGroup: PropTypes.object,
  libraryType: PropTypes.string,
  repo: PropTypes.object.isRequired,
  isItemFreezed: PropTypes.bool.isRequired,
  onFreezedItem: PropTypes.func.isRequired,
  onUnfreezedItem: PropTypes.func.isRequired,
  onItemUnshare: PropTypes.func.isRequired,
  onItmeDetails: PropTypes.func,
  onItemRename: PropTypes.func,
};

class SharedRepoListItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      highlight: false,
      isOperationShow: false,
      isItemMenuShow: false,
      isShowSharedDialog: false,
      isRenaming: false,
    };
    this.isDeparementOnwerGroupMember = false;
  }

  onMouseEnter = () => {
    if (!this.props.isItemFreezed) {
      this.setState({
        highlight: true,
        isOperationShow: true,
      });
    }
  }

  onMouseOver = () => {
    if (!this.props.isItemFreezed) {
      this.setState({
        highlight: true,
        isOperationShow: true,
      });
    }
  }
  
  onMouseLeave = () => {
    if (!this.props.isItemFreezed) {
      this.setState({
        highlight: false,
        isOperationShow: false,
      });
    }
  }

  clickOperationMenuToggle = (e) => {
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
          this.setState({
            highlight: false,
            isOperationShow: false,
          });
        }
      }
    );
  }

  getRepoComputeParams = () => {
    let repo = this.props.repo;
    
    let iconUrl = Utils.getLibIconUrl(repo);
    let iconTitle = Utils.getLibIconTitle(repo);
    let libPath = `${siteRoot}library/${repo.repo_id}/${Utils.encodePath(repo.repo_name)}/`;

    return { iconUrl, iconTitle, libPath };
  }

  onMenuItemClick = (e) => {
    let operation = e.target.dataset.toggle;
    switch(operation) {
      case 'Rename':
        this.onItemRenameToggle();
        break;
      case 'Folder Permission':
        this.onItemPermisionChanged();
        break;
      case 'Details':
        this.onItemDetails();
        break;
      case 'Share':
        this.onItemShare();
        break;
      case 'Unshare':
        this.onItemUnshare();
        break;
      default:
        break;
    }
  }

  onItemRenameToggle = () => {
    this.props.onFreezedItem();
    this.setState({
      isRenaming: !this.state.isRenaming,
      isOperationShow: !this.state.isOperationShow
    });
  }

  onRenameConfirm = (name) => {
    this.props.onItemRename(this.props.repo, name);
    this.onRenameCancel();
  }
  
  onRenameCancel = () => {
    this.props.onUnfreezedItem();
    this.setState({isRenaming: !this.state.isRenaming});
  }

  onItemPermisionChanged = () => {
    // todo
  }

  onItemDetails = () => {
    this.props.onItemDetails(this.props.repo);
  }

  onItemShare = () => {
    this.setState({isShowSharedDialog: true});
  }

  onItemUnshare = () => {
    this.props.onItemUnshare(this.props.repo);
  }

  onItemDelete = () => {
    this.props.onItemDelete(this.props.repo);
  }

  toggleShareDialog = () => {
    this.setState({isShowSharedDialog: false});
  }

  translateMenuItem = (menuItem) => {
    let translateResult = '';
    switch(menuItem) {
      case 'Rename':
        translateResult = gettext('Rename');
        break;
      case 'Folder Permission':
        translateResult = gettext('Folder Premission');
        break;
      case 'Details':
        translateResult = gettext('Details');
        break;
      case 'Unshare':
        translateResult = gettext('Unshare');
        break;
      case 'Share':
        translateResult = gettext('Share');
        break;
      default:
        break;
    }
    return translateResult;
  }

  generatorOperations = () => {
    let { repo, currentGroup } = this.props;
    //todo this have a bug; use current api is not return admins param;
    let isStaff = currentGroup && currentGroup.admins && currentGroup.admins.indexOf(username) > -1; //for group repolist;
    let isRepoOwner = repo.owner_email === username;
    let isAdmin = repo.is_admin;
    let operations = [];
    // todo ,shared width me shared width all;
    if (isPro) {
      if (repo.owner_email.indexOf('@seafile_group') != -1) {  //current repo is belong to a group;
        if (isStaff && repo.owner_email == currentGroup.id + '@seafile_group') { //is a member of this current group,
          this.isDeparementOnwerGroupMember = true;
          if (folderPermEnabled) {
            operations = ['Rename', 'Folder Permission', 'Details'];
          } else {
            operations = ['Rename', 'Details'];
          }
        } else {
          operations.push('Unshare');
        }
      } else {
        if (isRepoOwner || isAdmin) {
          operations.push('Share');
        }
        if (isStaff || isRepoOwner || isAdmin) {
          operations.push('Unshare');
        }
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
  } 

  generatorMobileMenu = () => {
    let operations = [];
    if (this.props.libraryType && this.props.libraryType === 'public') {
      let isRepoOwner = this.props.repo.owner_email === username;
      if (isSystemStaff || isRepoOwner) {
        operations.push('Unshare');
      }
    } else {
      operations = this.generatorOperations();
      if (this.isDeparementOnwerGroupMember) {
        operations.unshift('Unshare');
        operations.unshift('Share');
      }
    }
    return (
      <Dropdown isOpen={this.state.isItemMenuShow} toggle={this.toggleOperationMenu}>
        <DropdownToggle 
          tag="i" 
          className="sf-dropdown-toggle sf2-icon-caret-down" 
          title={gettext('More Operations')} 
          data-toggle="dropdown" 
          aria-expanded={this.state.isItemMenuShow}
          onClick={this.clickOperationMenuToggle}
        />
        <div className={`${this.state.isItemMenuShow?'':'d-none'}`} onClick={this.toggleOperationMenu}>
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
  }

  generatorPCMenu = () => {
    let operations = [];
    if (this.props.libraryType && this.props.libraryType === 'public') {
      let isRepoOwner = this.props.repo.owner_email === username;
      if (isSystemStaff || isRepoOwner) {
        operations.push('unshare');
      }
    } else {
      // scene one: (share, delete, itemToggle and other operations);
      // scene two: (share, unshare), (share), (unshare)
      operations = this.generatorOperations();
    }
    const shareOperation   = <a href="#" className="op-icon sf2-icon-share" title={gettext('Share')} onClick={this.onItemShare}></a>;
    const unshareOperation = <a href="#" className="op-icon sf2-icon-x3" title={gettext('Unshare')} onClick={this.onItemUnshare}></a>;
    const deleteOperation  = <a href="#" className="op-icon sf2-icon-delete" title={gettext('Delete')} onClick={this.onItemDelete}></a>;
    
    if (this.isDeparementOnwerGroupMember) {
      return (
        <Fragment>
          {shareOperation}
          {deleteOperation}
          <Dropdown isOpen={this.state.isItemMenuShow} toggle={this.toggleOperationMenu}>
            <DropdownToggle 
              tag="i" 
              className="sf-dropdown-toggle sf2-icon-caret-down" 
              title={gettext('More Operations')}
              data-toggle="dropdown" 
              aria-expanded={this.state.isItemMenuShow}
              onClick={this.clickOperationMenuToggle}
            />
            <DropdownMenu>
              {operations.map((item, index) => {
                return <DropdownItem key={index} data-toggle={item} onClick={this.onMenuItemClick}>{this.translateMenuItem(item)}</DropdownItem>;
              })}
            </DropdownMenu>
          </Dropdown>
        </Fragment>
      );
    } else {
      if (operations.length == 2) {
        return (
          <Fragment>
            {shareOperation}
            {unshareOperation}
          </Fragment>
        );
      }
      if (operations.length == 1 && operations[0] === 'share') {
        return shareOperation;
      }

      if (operations.length == 1 && operations[0] === 'unshare') {
        return unshareOperation;
      }
    }
    return null;
  }

  renderPCUI = () => {
    let { iconUrl, iconTitle, libPath } = this.getRepoComputeParams();
    let { repo } = this.props;

    // TODO: enableDirPrivateShare, isGroupOwnedRepo
    let isGroupOwnedRepo = repo.owner_email.indexOf('@seafile_group') > -1;
    return (
      <Fragment>
        <tr className={this.state.highlight ? 'tr-highlight' : ''} onMouseEnter={this.onMouseEnter} onMouseOver={this.onMouseOver} onMouseLeave={this.onMouseLeave}>
          <td><img src={iconUrl} title={repo.iconTitle} alt={iconTitle} width="24" /></td>
          <td>
            {this.state.isRenaming ? 
              <Rename  name={repo.repo_name} onRenameConfirm={this.onRenameConfirm} onRenameCancel={this.onRenameCancel}/> : 
              <Link to={libPath}>{repo.repo_name}</Link>
            }
          </td>
          <td>{this.state.isOperationShow && this.generatorPCMenu()}</td>
          <td>{repo.size}</td>
          <td title={moment(repo.last_modified).format('llll')}>{moment(repo.last_modified).fromNow()}</td>
          <td title={repo.owner_contact_email}>{repo.owner_name}</td>
        </tr>
        {this.state.isShowSharedDialog && (
          <ModalPotal>
            <ShareDialog 
              itemType={'library'}
              itemName={repo.repo_name}
              itemPath={'/'}
              repoID={repo.repo_id}
              repoEncrypted={repo.encrypted}
              enableDirPrivateShare={true}
              userPerm={repo.permission}
              isAdmin={repo.is_admin}
              isGroupOwnedRepo={isGroupOwnedRepo}
              toggleDialog={this.toggleShareDialog}
            />
          </ModalPotal>
        )}
      </Fragment>
    );
  }
  
  renderMobileUI = () => {
    let { iconUrl, iconTitle, libPath } = this.getRepoComputeParams();
    let { repo } = this.props;
    let isGroupOwnedRepo = repo.owner_email.indexOf('@seafile_group') > -1;
    return (
      <Fragment>
        <tr className={this.state.highlight ? 'tr-highlight' : ''}  onMouseEnter={this.onMouseEnter} onMouseOver={this.onMouseOver} onMouseLeave={this.onMouseLeave}>
          <td><img src={iconUrl} title={iconTitle} width="24" alt={iconTitle}/></td>
          <td>
            {this.state.isRenaming ? 
              <Rename name={repo.repo_name} onRenameConfirm={this.onRenameConfirm} onRenameCancel={this.onRenameCancel} /> :
              <Link to={libPath}>{repo.repo_name}</Link>  
            }
            <br />
            <span className="item-meta-info" title={repo.owner_contact_email}>{repo.owner_name}</span>
            <span className="item-meta-info">{repo.size}</span>
            <span className="item-meta-info" title={moment(repo.last_modified).format('llll')}>{moment(repo.last_modified).fromNow()}</span>
          </td>
          <td>{this.generatorMobileMenu()}</td>
        </tr>
        {this.state.isShowSharedDialog && (
          <ModalPotal>
            <ShareDialog 
              itemType={'library'}
              itemName={repo.repo_name}
              itemPath={'/'}
              repoID={repo.repo_id}
              repoEncrypted={repo.encrypted}
              enableDirPrivateShare={true}
              userPerm={repo.permission}
              isAdmin={repo.is_admin}
              isGroupOwnedRepo={isGroupOwnedRepo}
              toggleDialog={this.toggleShareDialog}
            />
          </ModalPotal>
        )}
      </Fragment>
    );
  }

  render() {
    if (window.innerWidth >= 768) {
      return this.renderPCUI();
    } else {
      return this.renderMobileUI();
    }
  }
}

SharedRepoListItem.propTypes = propTypes;

export default SharedRepoListItem;
