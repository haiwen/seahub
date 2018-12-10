import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import { Dropdown, DropdownMenu, DropdownToggle, DropdownItem } from 'reactstrap';
import { Utils } from '../../utils/utils';
import { gettext, siteRoot, isPro, username, folderPermEnabled } from '../../utils/constants';

const propTypes = {
  currentGroup: PropTypes.object,
  repo: PropTypes.object.isRequired,
  isItemFreezed: PropTypes.bool.isRequired,
  onFreezedItem: PropTypes.func.isRequired,
  onItemUnshared: PropTypes.func.isRequired,
};

class SharedRepoListItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      highlight: false,
      isOperationShow: false,
      isItemMenuShow: false,
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
    e.preventDefault();
    this.toggleOperationMenu();
  }

  toggleOperationMenu = () => {
    if (this.props.isItemFreezed) {
      this.setState({
        highlight: false,
        isOperationShow: false,
        isItemMenuShow: !this.state.isItemMenuShow
      });
    } else {
      this.setState({
        isItemMenuShow: !this.state.isItemMenuShow
      });
    }
    this.props.onFreezedItem();
  }

  getRepoComputeParams = () => {
    let repo = this.props.repo;
    let currentGroup = this.props.currentGroup; //todo--change to libray
    let isReadyOnly = false;
    if ( repo.permission === 'r' || repo.permission === 'preview') {
      isReadyOnly = true;
    }
    let iconUrl = Utils.getLibIconUrl({
      is_encryted: repo.encrypted, 
      is_readyonly: isReadyOnly,
      size: Utils.isHiDPI() ? 48 : 24
    });
    let iconTitle = Utils.getLibIconTitle({
      'encrypted': repo.encrypted,
      'is_admin': repo.is_admin,
      'permission': repo.permission
    });

    //todo change to library; div-view is not compatibility
    let libPath = `${siteRoot}#group/${currentGroup.id}/lib/${this.props.repo.repo_id}/`;

    return { iconUrl, iconTitle, libPath };
  }

  onMenuItemClick = (e) => {
    let operation = e.target.dataset.toggle;
    switch(operation) {
      case 'Rename':
        this.onItemRename();
        break;
      case 'Folder Permission':
        this.onItemPermisionChanged();
        break;
      case 'Details':
        this.onItemDetails();
        break;
      case 'Share':
        this.onItemShared();
        break;
      case 'Unshare':
        this.onItemUnshared();
        break;
      default:
        break;
    }
  }

  onItemRename = () => {
    // todo
  }

  onItemPermisionChanged = () => {
    // todo
  }

  onItemDetails = () => {
    // todo
  }

  onItemShared = () => {
    // todo
  }

  onItemUnshared = () => {
    // todo
    this.props.onItemUnshared(this.props.repo);
  }

  onItemDelete = () => {
    // todo
  }

  generatorOperations = () => {
    let { repo, currentGroup } = this.props;
    //todo this have a bug; use current api is not return admins param;
    let isStaff = currentGroup.admins && currentGroup.admins.indexOf(username) > -1; //for group repolist;
    let isRepoOwner = repo.owner_email === username;
    let isAdmin = repo.is_admin;
    let operations = [];
    // todo ,shared width me shared width all;
    if (isPro) {
      if (repo.owner_email.indexOf('@seafile_group') != -1) {  //current repo is belong to a group;
        if (isStaff && repo.owner_email == currentGroup.id + '@seafile_group') { //is a member of this current group,
          this.isDeparementOnwerGroupMember = true;
          if (folderPermEnabled) {
            operations = ['Rename', 'Folder Permission', 'deatils'];
          } else {
            operations = ['Rename', 'Details']
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
        operations.push('share');
      }
      if (isStaff || isRepoOwner) {
        operations.push('Unshare');
      }
    }
    return operations;
  } 

  generatorMobileMenu = () => {
    let operations = this.generatorOperations();
    if (this.isDeparementOnwerGroupMember) {
      operations.unshift('unshare');
      operations.unshift('share');
    }
    return (
      <Dropdown isOpen={this.state.isItemMenuShow} toggle={this.toggleOperationMenu}>
        <DropdownToggle 
          tag="a" 
          className="sf2-icon-caret-down item-operation-menu-toggle-icon op-icon" 
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
                <DropdownItem key={index} data-toggle={item} onClick={this.onMenuItemClick}>{gettext(item)}</DropdownItem>
              );
            })}
          </div>
        </div>
      </Dropdown>
    );
  }

  generatorPCMenu = () => {
    // scene one: (share, delete, itemToggle and other operations);
    // scene two: (share, unshare), (share), (unshare)
    let operations = this.generatorOperations();
    const shareOperation   = <a href="#" className="sf2-icon-share sf2-x op-icon" title={gettext("Share")} onClick={this.onItemShared}></a>;
    const unshareOperation = <a href="#" className="sf2-icon-x3 sf2-x op-icon" title={gettext("Unshare")} onClick={this.onItemUnshared}></a>
    const deleteOperation  = <a href="#" className="sf2-icon-delete sf2-x op-icon" title={gettext('Delete')} onClick={this.onItemDelete}></a>;
    
    if (this.isDeparementOnwerGroupMember) {
      return (
        <Fragment>
          {shareOperation}
          {deleteOperation}
          <Dropdown isOpen={this.state.isItemMenuShow} toggle={this.toggleOperationMenu}>
            <DropdownToggle 
              tag="a" 
              className="sf2-icon-caret-down item-operation-menu-toggle-icon op-icon" 
              title={gettext('More Operations')}
              data-toggle="dropdown" 
              aria-expanded={this.state.isItemMenuShow}
              onClick={this.clickOperationMenuToggle}
            />
            <DropdownMenu>
              {operations.map((item, index) => {
                return <DropdownItem key={index} data-toggle={item} onClick={this.onMenuItemClick}>{gettext(item)}</DropdownItem>
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
    return (
      <tr className={this.state.highlight ? 'tr-highlight' : ''} onMouseEnter={this.onMouseEnter} onMouseOver={this.onMouseOver} onMouseLeave={this.onMouseLeave}>
        <td><img src={iconUrl} title={repo.iconTitle} alt={iconTitle} width="24" /></td>
        <td><a href={libPath}>{repo.repo_name}</a></td>
        <td>{this.state.isOperationShow && this.generatorPCMenu()}</td>
        <td>{repo.size}</td>
        <td title={moment(repo.last_modified).format('llll')}>{moment(repo.last_modified).fromNow()}</td>
        <td title={repo.owner_contact_email}>{repo.owner_name}</td>
      </tr>
    );
  }
  
  renderMobileUI = () => {
    let { iconUrl, iconTitle, libPath } = this.getRepoComputeParams();
    let { repo } = this.props;
    return (
      <tr className={this.state.highlight ? 'tr-highlight' : ''}  onMouseEnter={this.onMouseEnter} onMouseOver={this.onMouseOver} onMouseLeave={this.onMouseLeave}>
        <td><img src={iconUrl} title={iconTitle} alt={iconTitle}/></td>
        <td>
          <a href={libPath}>{repo.repo_name}</a><br />
          <span className="item-meta-info" title={repo.owner_contact_email}>{repo.owner_name}</span>
          <span className="item-meta-info">{repo.size}</span>
          <span className="item-meta-info" title={moment(repo.last_modified).format('llll')}>{moment(repo.last_modified).fromNow()}</span>
        </td>
        <td>{this.generatorMobileMenu()}</td>
      </tr>
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
