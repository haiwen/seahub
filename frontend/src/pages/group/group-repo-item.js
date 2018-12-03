import React, { Component } from 'react';
import { Dropdown, DropdownMenu, DropdownToggle, DropdownItem } from 'reactstrap';
import moment from 'moment';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import { gettext, siteRoot, loginUrl, isPro, folderPermEnabled, username } from '../../utils/constants';

class GroupRepoItem extends Component {

  constructor(props) {
    super(props);
    this.state = {
      showOpIcon: false,
      operationMenuOpen: false,
      unshared: false
    };

    this.handleMouseOver = this.handleMouseOver.bind(this);
    this.handleMouseOut = this.handleMouseOut.bind(this);
    this.toggleOperationMenu = this.toggleOperationMenu.bind(this);
    this.clickOperationMenuToggle = this.clickOperationMenuToggle.bind(this);

    this.share = this.share.bind(this);
    this.unshare = this.unshare.bind(this);

    this.deleteItem = this.deleteItem.bind(this);

    this.rename = this.rename.bind(this);
    this.folderPerm = this.folderPerm.bind(this);
    this.showDetails = this.showDetails.bind(this);
  }

  handleMouseOver() {
    this.setState({
      showOpIcon: true
    });
  }

  handleMouseOut() {
    this.setState({
      showOpIcon: false
    });
  }

  toggleOperationMenu() {
    this.setState({
      operationMenuOpen: !this.state.operationMenuOpen
    });
  }

  clickOperationMenuToggle(e) {
    e.preventDefault();
    this.toggleOperationMenu();
  }

  share(e) {
    e.preventDefault();
    // TODO
  }

  unshare(e) {
    e.preventDefault();
    // TODO
    
    const data = this.props.data;

    let request;
    if (data.owner_email.indexOf('@seafile_group') == -1) {
      let options = {
        'share_type': 'personal',
        'from': data.owner_email
      };
      request = seafileAPI.leaveShareRepo(data.repo_id, options);
    } else {
      request = seafileAPI.leaveShareGroupOwnedRepo(data.repo_id);
    }

    request.then((res) => {
      this.setState({
        unshared: true
      });
      // TODO: show feedback msg
    }).catch((error) => {
        // TODO: show feedback msg
    });
  }

  deleteItem() {
    // TODO
    const data = this.props.data;
    seafileAPI.deleteRepo(data.repo_id).then((res) => {
      this.setState({
        deleted: true
      });
      // TODO: show feedback msg
    }).catch((error) => {
        // TODO: show feedback msg
    });
  }

  rename() {
  }

  folderPerm() {
  }

  showDetails() {
  }

  render() {

    if (this.state.unshared) {
      return null;
    }

    const data = this.props.data;
    const permission = data.permission;

    const {groupId, isStaff, showRepoOwner} = this.props.extra;
    const isRepoOwner = username == data.owner_email;
    const isAdmin = data.is_admin;

    let is_readonly = false;
    if (permission == 'r' || permission == 'preview') {
      is_readonly = true;
    }
    data.icon_url = Utils.getLibIconUrl({
      is_encrypted: data.encrypted,
      is_readonly: is_readonly, 
      size: Utils.isHiDPI() ? 48 : 24
    }); 
    data.icon_title = Utils.getLibIconTitle({
      'encrypted': data.encrypted,
      'is_admin': data.is_admin,
      'permission': permission
    });
    data.url = `${siteRoot}#group/${groupId}/lib/${data.repo_id}/`;

    let iconVisibility = this.state.showOpIcon ? '' : ' invisible';
    let shareIconClassName = 'sf2-icon-share sf2-x repo-share-btn op-icon' + iconVisibility; 
    let unshareIconClassName = 'sf2-icon-x3 sf2-x op-icon' + iconVisibility; 
    let deleteIconClassName = 'sf2-icon-delete sf2-x op-icon' + iconVisibility;
    let operationMenuToggleIconClassName = 'sf2-icon-caret-down item-operation-menu-toggle-icon op-icon';
    if (window.innerWidth >= 768) {
      operationMenuToggleIconClassName += iconVisibility;
    }

    const commonToggle = (
      <DropdownToggle
        tag="a" href="#" className={operationMenuToggleIconClassName} title={gettext('More Operations')}
        onClick={this.clickOperationMenuToggle}
        data-toggle="dropdown" aria-expanded={this.state.operationMenuOpen}>
      </DropdownToggle>
    );

    const commonOperationsInMenu = (
      <React.Fragment>
        <DropdownItem onClick={this.rename}>{gettext('Rename')}</DropdownItem>
        {folderPermEnabled ? <DropdownItem onClick={this.folderPerm}>{gettext('Folder Permission')}</DropdownItem> : null}
        <DropdownItem onClick={this.showDetails}>{gettext('Details')}</DropdownItem>
      </React.Fragment>
    );

    let desktopOperations;
    let mobileOperationMenu;

    const share = <a href="#" className={shareIconClassName} title={gettext("Share")} onClick={this.share}></a>;
    const unshare = <a href="#" className={unshareIconClassName} title={gettext("Unshare")} onClick={this.unshare}></a>

    const shareDropdownItem = <DropdownItem onClick={this.share}>{gettext('Share')}</DropdownItem>;
    const unshareDropdownItem = <DropdownItem onClick={this.unshare}>{gettext('Unshare')}</DropdownItem>;

    if (isPro) {
      if (data.owner_email.indexOf('@seafile_group') != -1) { // group owned repo
        if (isStaff) {
          if (data.owner_email == groupId + '@seafile_group') { // this repo belongs to the current group
            desktopOperations = (
              <React.Fragment>
                {share}
                <a href="#" className={deleteIconClassName} title={gettext('Delete')} onClick={this.deleteItem}></a>
                <Dropdown isOpen={this.state.operationMenuOpen} toggle={this.toggleOperationMenu}>
                  {commonToggle}
                  <DropdownMenu>
                    {commonOperationsInMenu}
                  </DropdownMenu>
                </Dropdown>
              </React.Fragment>
            );
            mobileOperationMenu = (
              <React.Fragment>
                {shareDropdownItem}
                <DropdownItem onClick={this.deleteItem}>{gettext('Delete')}</DropdownItem>
                {commonOperationsInMenu}
              </React.Fragment>
            );
          } else {
            desktopOperations = unshare;
            mobileOperationMenu = unshareDropdownItem;
          }
        }
      } else {
        desktopOperations = (
          <React.Fragment>
            {isRepoOwner || isAdmin ? share : null}
            {isStaff || isRepoOwner || isAdmin ? unshare : null}
          </React.Fragment>
        );
        mobileOperationMenu = (
          <React.Fragment>
            {isRepoOwner || isAdmin ? shareDropdownItem : null}
            {isStaff || isRepoOwner || isAdmin ? unshareDropdownItem : null}
          </React.Fragment>
        );
      }
    } else {
      desktopOperations = (
        <React.Fragment>
          {isRepoOwner ? share : null}
          {isStaff || isRepoOwner ? unshare : null}
        </React.Fragment>
      );
      mobileOperationMenu = (
        <React.Fragment>
          {isRepoOwner ? shareDropdownItem : null}
          {isStaff || isRepoOwner ? unshareDropdownItem : null}
        </React.Fragment>
      );
    }

    const mobileOperations = (
      <Dropdown isOpen={this.state.operationMenuOpen} toggle={this.toggleOperationMenu}>
        {commonToggle}
        <div className={`${this.state.operationMenuOpen?'':'d-none'}`} onClick={this.toggleOperationMenu}>
          <div className="mobile-operation-menu-bg-layer"></div>
          <div className="mobile-operation-menu">
            {mobileOperationMenu}
          </div>
        </div>
      </Dropdown>
    );

    const desktopItem = (
      <tr onMouseOver={this.handleMouseOver} onMouseOut={this.handleMouseOut}>
        <td><img src={data.icon_url} title={data.icon_title} alt={data.icon_title} width="24" /></td>
        <td><a href={data.url}>{data.repo_name}</a></td>
        <td>{desktopOperations}</td>
        <td>{Utils.formatSize({bytes: data.size})}</td>
        <td title={moment(data.last_modified).format('llll')}>{moment(data.last_modified).fromNow()}</td>
        {showRepoOwner ? <td title={data.owner_contact_email}>{data.owner_name}</td> : null}
      </tr>
    );

    const mobileItem = (
      <tr onMouseOver={this.handleMouseOver} onMouseOut={this.handleMouseOut}>
        <td><img src={data.icon_url} title={data.icon_title} alt={data.icon_title} width="24" /></td>
        <td>
          <a href={data.url}>{data.repo_name}</a><br />
          {showRepoOwner ? <span className="item-meta-info" title={data.owner_contact_email}>{data.owner_name}</span> : null}
          <span className="item-meta-info">{Utils.formatSize({bytes: data.size})}</span>
          <span className="item-meta-info" title={moment(data.last_modified).format('llll')}>{moment(data.last_modified).fromNow()}</span>
        </td>
        <td>{mobileOperations}</td>
      </tr>
    );

    return window.innerWidth >= 768 ? desktopItem : mobileItem;
  }
}

export default GroupRepoItem;
