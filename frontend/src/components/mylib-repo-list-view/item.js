
import React, { Component } from 'react';
import moment from 'moment';
import { Link } from '@reach/router';
import { Dropdown, DropdownMenu, DropdownToggle, DropdownItem } from 'reactstrap';
import { gettext, siteRoot, storages, canGenerateShareLink, canGenerateUploadLink, folderPermEnabled, enableRepoSnapshotLabel } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import { seafileAPI } from '../../utils/seafile-api';
import RenameInput from '../../components/rename-input';

class Item extends Component {

  constructor(props) {
    super(props);
    this.state = {
      showOpIcon: false,
      operationMenuOpen: false,
      deleted: false,
      showChangeLibName: false, 
      repoName: this.props.data.repo_name,
    };

    this.handleMouseOver = this.handleMouseOver.bind(this);
    this.handleMouseOut = this.handleMouseOut.bind(this);
    this.toggleOperationMenu = this.toggleOperationMenu.bind(this);
    this.clickOperationMenuToggle = this.clickOperationMenuToggle.bind(this);

    this.share = this.share.bind(this);

    this.showDeleteItemPopup = this.showDeleteItemPopup.bind(this);
    this.deleteItem = this.deleteItem.bind(this);

    this.rename = this.rename.bind(this);
    this.transfer = this.transfer.bind(this);
    this.historySetting = this.historySetting.bind(this);
    this.changePassword = this.changePassword.bind(this);
    this.showLinks = this.showLinks.bind(this);
    this.folderPerm = this.folderPerm.bind(this);
    this.showDetails = this.showDetails.bind(this);
    this.label = this.label.bind(this);
  }

  handleMouseOver() {
    if (this.state.operationMenuOpen) {
      return;
    }
    this.setState({
      showOpIcon: true
    });
  }

  handleMouseOut() {
    if (this.state.operationMenuOpen) {
      return;
    }
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

  showDeleteItemPopup(e) {
    e.preventDefault(); // for `<a>`

    const data = this.props.data;
    this.props.operations.showDeleteItemPopup({
      repoName: data.repo_name,
      yesCallback: this.deleteItem,
      _this: this
    });
  }

  deleteItem() {
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
    this.setState({
      showChangeLibName: !this.state.showChangeLibName
    })
  }

  onChangeLibName = (e) => {
    this.setState({
      repoName: e.target.value
    })
  }

  updateLibName = () => {
    const itemID = this.props.data.repo_id;
    seafileAPI.renameRepo(itemID, this.state.repoName).then(res => {
      this.rename();
      this.props.operations.onRenameRepo(itemID, this.state.repoName);
    }).catch(res => {
      // TODO res error 
    })
  }

  transfer() {
    const itemName = this.props.data.repo_name;
    const itemID = this.props.data.repo_id;
    this.props.operations.onTransfer(itemName, itemID);
  }

  historySetting() {
    const itemName = this.props.data.repo_name;
    const itemID = this.props.data.repo_id;
    this.props.operations.onHistorySetting(itemName, itemID);
  }

  changePassword() {
  }

  showLinks() {
  }

  folderPerm() {
  }

  showDetails() {
    let data = this.props.data;
    this.props.operations.onDetails(data);
  }
  
  label() {
  }

  render() {

    if (this.state.deleted) {
      return null;
    }

    const data = this.props.data;
    const permission = data.permission;

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
    data.url = `${siteRoot}#my-libs/lib/${data.repo_id}/`;

    let iconVisibility = this.state.showOpIcon ? '' : ' invisible';
    let shareIconClassName = 'sf2-icon-share sf2-x op-icon' + iconVisibility; 
    let deleteIconClassName = 'sf2-icon-delete sf2-x op-icon' + iconVisibility;
    let operationMenuToggleIconClassName = 'sf2-icon-caret-down item-operation-menu-toggle-icon op-icon'; 
    if (window.innerWidth >= 768) {
      operationMenuToggleIconClassName += iconVisibility; 
    }

    const showShareLinks = !data.encrypted && (canGenerateShareLink || canGenerateUploadLink);

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
        <DropdownItem onClick={this.transfer}>{gettext('Transfer')}</DropdownItem>
        <DropdownItem onClick={this.historySetting}>{gettext('History Setting')}</DropdownItem>
        {data.encrypted ? <DropdownItem onClick={this.changePassword}>{gettext('Change Password')}</DropdownItem> : ''}
        {showShareLinks ? <DropdownItem onClick={this.showLinks}>{gettext('Share Links')}</DropdownItem> : ''}
        {folderPermEnabled ? <DropdownItem onClick={this.folderPerm}>{gettext('Folder Permission')}</DropdownItem> : ''}
        <DropdownItem onClick={this.showDetails}>{gettext('Details')}</DropdownItem>
      </React.Fragment>
    );

    const desktopOperations = (
      <div>
        <a href="#" className={shareIconClassName} title={gettext("Share")} onClick={this.share}></a>
        <a href="#" className={deleteIconClassName} title={gettext("Delete")} onClick={this.showDeleteItemPopup}></a>
        <Dropdown isOpen={this.state.operationMenuOpen} toggle={this.toggleOperationMenu}>
          {commonToggle}
          <DropdownMenu>
            {commonOperationsInMenu}
            {enableRepoSnapshotLabel ? <DropdownItem onClick={this.label}>{gettext('Label current state')}</DropdownItem> : ''}
          </DropdownMenu>
        </Dropdown>
      </div>
    );

    const mobileOperations = (
      <Dropdown isOpen={this.state.operationMenuOpen} toggle={this.toggleOperationMenu}>
        {commonToggle}
        <div className={`${this.state.operationMenuOpen?'':'d-none'}`} onClick={this.toggleOperationMenu}>
          <div className="mobile-operation-menu-bg-layer"></div>
          <div className="mobile-operation-menu">
            <DropdownItem onClick={this.share}>{gettext('Share')}</DropdownItem>
            <DropdownItem onClick={this.showDeleteItemPopup}>{gettext('Delete')}</DropdownItem>
            {commonOperationsInMenu}
          </div>
        </div>
      </Dropdown>
    );

    const desktopItem = (
      <tr onMouseOver={this.handleMouseOver} onMouseOut={this.handleMouseOut}>
        <td><img src={data.icon_url} title={data.icon_title} alt={data.icon_title} width="24" /></td>
        <td>
          {this.state.showChangeLibName && (
            <RenameInput 
              name={data.repo_name} 
              onRenameConfirm={this.updateLibName} 
              onRenameCancel={this.rename}
            />
          )}
          {!this.state.showChangeLibName && data.repo_name && (
            <Link to={`${siteRoot}library/${data.repo_id}/${data.repo_name}/`}>{data.repo_name}</Link>
          )}
          {!this.state.showChangeLibName && !data.repo_name && 
            (gettext('Broken (please contact your administrator to fix this library)'))
          }
        </td>
        <td>{data.repo_name ? desktopOperations : ''}</td>
        <td>{Utils.formatSize({bytes: data.size})}</td>
        {storages.length ? <td>{data.storage_name}</td> : null}
        <td title={moment(data.last_modified).format('llll')}>{moment(data.last_modified).fromNow()}</td>
      </tr>
    );

    const mobileItem = (
      <tr onMouseOver={this.handleMouseOver} onMouseOut={this.handleMouseOut}>
        <td><img src={data.icon_url} title={data.icon_title} alt={data.icon_title} width="24" /></td>
        <td>
          {data.repo_name ?
            <Link to={`${siteRoot}library/${data.repo_id}/${data.repo_name}/`}>{data.repo_name}</Link> :
            gettext('Broken (please contact your administrator to fix this library)')}
          <br />
          <span className="item-meta-info">{Utils.formatSize({bytes: data.size})}</span>
          <span className="item-meta-info" title={moment(data.last_modified).format('llll')}>{moment(data.last_modified).fromNow()}</span>
        </td>
        <td>{data.repo_name ? mobileOperations : ''}</td>
      </tr>
    );

    return window.innerWidth >= 768 ? desktopItem : mobileItem;
  }
}

export default Item;