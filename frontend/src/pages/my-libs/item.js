import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import { Link } from '@reach/router';
import { Dropdown, DropdownMenu, DropdownToggle, DropdownItem } from 'reactstrap';
import { gettext, siteRoot, storages, folderPermEnabled, enableRepoSnapshotLabel } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import { seafileAPI } from '../../utils/seafile-api';
import Rename from '../../components/rename';
import ModalPotal from '../../components/modal-portal';
import ShareDialog from '../../components/dialog/share-dialog';
import ChangeRepoPasswordDialog from '../../components/dialog/change-repo-password-dialog';

const propTypes = {
  data: PropTypes.object.isRequired,
  isItemFreezed: PropTypes.bool.isRequired,
  onItemFreezedToggle: PropTypes.func.isRequired,
  onRenameRepo: PropTypes.func.isRequired,
  onDeleteRepo: PropTypes.func.isRequired,
  onTransfer: PropTypes.func.isRequired,
  showDeleteItemPopup: PropTypes.func.isRequired,
  onHistorySetting: PropTypes.func.isRequired,
  onRepoDetails: PropTypes.func.isRequired,
  onItemClick: PropTypes.func.isRequired
};

class Item extends Component {

  constructor(props) {
    super(props);
    this.state = {
      showOpIcon: false,
      operationMenuOpen: false,
      showChangeLibName: false, 
      isShowSharedDialog: false,
      highlight: false,
      isChangeRepoPasswordDialogOpen: false
    };
  }

  handleMouseOver = () => {
    if (!this.props.isItemFreezed) {
      this.setState({
        showOpIcon: true,
        highlight: true,
      });
    }
  }

  handleMouseOut = () => {
    if (!this.props.isItemFreezed) {
      this.setState({
        showOpIcon: false,
        highlight: false
      });
    }
  }

  clickOperationMenuToggle = (e) => {
    e.preventDefault();
    this.toggleOperationMenu(e);
  }
  
  toggleOperationMenu = (e) => {
    if (e.target.dataset.toggle !== 'item') {
      if (this.props.isItemFreezed) {
        this.setState({
          highlight: false,
          showOpIcon: false,
        });
      }
      this.setState({
        operationMenuOpen: !this.state.operationMenuOpen
      });
      this.props.onItemFreezedToggle();
    }
  }

  share = (e) => {
    e.preventDefault();
    this.setState({isShowSharedDialog: true});
  }

  toggleShareDialog = () => {
    this.setState({isShowSharedDialog: false});
  }

  showDeleteItemPopup = (e) => {
    e.preventDefault(); // for `<a>`
    const data = this.props.data;
    this.props.showDeleteItemPopup({
      repoName: data.repo_name,
      yesCallback: this.deleteItem,
      _this: this
    });
  }

  deleteItem = () => {
    const repo = this.props.data;
    seafileAPI.deleteRepo(repo.repo_id).then((res) => {
      this.props.onDeleteRepo(repo);
      // TODO: show feedback msg
    }).catch((error) => {

      // TODO: show feedback msg
    });
  }

  onRenameToggle = () => {
    this.setState({
      showOpIcon: false,
      showChangeLibName: true,
      operationMenuOpen: false,
    });
  }

  onRenameConfirm = (newName) => {
    let repo = this.props.data;
    let repoID = repo.repo_id;
    seafileAPI.renameRepo(repoID, newName).then(() => {
      this.props.onRenameRepo(repo, newName);
      this.onRenameCancel();
    });
  }
  
  onRenameCancel = () => {
    this.setState({
      showChangeLibName: !this.state.showChangeLibName,
    });
    this.props.onItemFreezedToggle();
  }

  transfer = () => {
    const itemName = this.props.data.repo_name;
    const itemID = this.props.data.repo_id;
    this.props.onTransfer(itemName, itemID);
  }

  historySetting = () => {
    const itemName = this.props.data.repo_name;
    const itemID = this.props.data.repo_id;
    this.props.onHistorySetting(itemName, itemID);
  }

  changePassword = () => {
    this.setState({isChangeRepoPasswordDialogOpen: true});
  }

  toggleChangePasswordDialog = () => {
    this.setState({isChangeRepoPasswordDialogOpen: !this.state.isChangeRepoPasswordDialogOpen});
  }

  folderPerm = () => {
  }

  // on '<tr>'
  onItemClick = (e) => {
    // '<td>' is clicked
    if (e.target.tagName == 'TD') {
      this.props.onItemClick(this.props.data);
    }
  }

  showDetails = () => {
    let data = this.props.data;
    this.props.onRepoDetails(data);
  }
  
  label = () => {
  }

  render() {
    const data = this.props.data;
    
    data.icon_url = Utils.getLibIconUrl(data); 
    data.icon_title = Utils.getLibIconTitle(data);
    data.url = `${siteRoot}library/${data.repo_id}/${Utils.encodePath(data.repo_name)}/`;

    let iconVisibility = this.state.showOpIcon ? '' : ' invisible';
    let shareIconClassName = 'op-icon op-target-share' + iconVisibility; 
    let deleteIconClassName = 'op-icon op-target-delete' + iconVisibility;
    let operationMenuToggleIconClassName = 'sf-dropdown-toggle op-target-caret-down'; 
    if (window.innerWidth >= 768) {
      operationMenuToggleIconClassName += iconVisibility; 
    }

    const commonToggle = (
      <DropdownToggle
        tag="i" 
        className={operationMenuToggleIconClassName} 
        title={gettext('More Operations')}
        // onClick={this.clickOperationMenuToggle}
        data-toggle="dropdown" 
        aria-expanded={this.state.operationMenuOpen}
      />
    );
    const commonOperationsInMenu = (
      <React.Fragment>
        <DropdownItem data-toggle="item" onClick={this.onRenameToggle}>{gettext('Rename')}</DropdownItem>
        <DropdownItem onClick={this.transfer}>{gettext('Transfer')}</DropdownItem>
        <DropdownItem onClick={this.historySetting}>{gettext('History Setting')}</DropdownItem>
        {data.encrypted ? <DropdownItem onClick={this.changePassword}>{gettext('Change Password')}</DropdownItem> : ''}
        {folderPermEnabled ? <DropdownItem onClick={this.folderPerm}>{gettext('Folder Permission')}</DropdownItem> : ''}
        <DropdownItem onClick={this.showDetails}>{gettext('Details')}</DropdownItem>
      </React.Fragment>
    );

    const desktopOperations = (
      <div>
        <a href="#" className={shareIconClassName} title={gettext('Share')} onClick={this.share}></a>
        <a href="#" className={deleteIconClassName} title={gettext('Delete')} onClick={this.showDeleteItemPopup}></a>
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
        <div className={`${this.state.operationMenuOpen ? '' : 'd-none'}`} onClick={this.toggleOperationMenu}>
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
      <Fragment>
        <tr className={this.state.highlight ? 'tr-highlight' : ''} onMouseOver={this.handleMouseOver} onMouseOut={this.handleMouseOut} onClick={this.onItemClick}>
          <td><img src={data.icon_url} title={data.icon_title} alt={data.icon_title} width="24" /></td>
          <td>
            {this.state.showChangeLibName && (
              <Rename 
                name={data.repo_name} 
                onRenameConfirm={this.onRenameConfirm} 
                onRenameCancel={this.onRenameCancel}
              />
            )}
            {!this.state.showChangeLibName && data.repo_name && (
              <Link to={data.url}>{data.repo_name}</Link>
            )}
            {!this.state.showChangeLibName && !data.repo_name && 
              (gettext('Broken (please contact your administrator to fix this library)'))
            }
          </td>
          <td>{data.repo_name ? desktopOperations : ''}</td>
          <td>{data.size}</td>
          {storages.length ? <td>{data.storage_name}</td> : null}
          <td title={moment(data.last_modified).format('llll')}>{moment(data.last_modified).fromNow()}</td>
        </tr>
        {this.state.isShowSharedDialog && (
          <ModalPotal>
            <ShareDialog 
              itemType={'library'}
              itemName={data.repo_name}
              itemPath={'/'}
              repoID={data.repo_id}
              repoEncrypted={data.encrypted}
              enableDirPrivateShare={true}
              userPerm={data.permission}
              toggleDialog={this.toggleShareDialog}
            />
          </ModalPotal>
        )}
        {this.state.isChangeRepoPasswordDialogOpen && (
          <ModalPotal>
            <ChangeRepoPasswordDialog
              repoID={data.repo_id}
              repoName={data.repo_name}
              toggleDialog={this.toggleChangePasswordDialog}
            />
          </ModalPotal>
        )}
      </Fragment>
    );

    const mobileItem = (
      <Fragment>
        <tr className={this.state.highlight ? 'tr-highlight' : ''}  onMouseOver={this.handleMouseOver} onMouseOut={this.handleMouseOut} onClick={this.onItemClick}>
          <td><img src={data.icon_url} title={data.icon_title} alt={data.icon_title} width="24" /></td>
          <td>
            {data.repo_name ?
              <Link to={data.url}>{data.repo_name}</Link> :
              gettext('Broken (please contact your administrator to fix this library)')}
            <br />
            <span className="item-meta-info">{data.size}</span>
            <span className="item-meta-info" title={moment(data.last_modified).format('llll')}>{moment(data.last_modified).fromNow()}</span>
          </td>
          <td>{data.repo_name ? mobileOperations : ''}</td>
        </tr>
        {this.state.isShowSharedDialog && (
          <ModalPotal>
            <ShareDialog 
              itemType={'library'}
              itemName={data.repo_name}
              itemPath={'/'}
              repoID={data.repo_id}
              repoEncrypted={data.encrypted}
              enableDirPrivateShare={true}
              userPerm={data.permission}
              toggleDialog={this.toggleShareDialog}
            />
          </ModalPotal>
        )}
        {this.state.isChangeRepoPasswordDialogOpen && (
          <ModalPotal>
            <ChangeRepoPasswordDialog
              repoID={data.repo_id}
              repoName={data.repo_name}
              toggleDialog={this.toggleChangePasswordDialog}
            />
          </ModalPotal>
        )}
      </Fragment>
    );

    return window.innerWidth >= 768 ? desktopItem : mobileItem;
  }
}

Item.propTypes = propTypes;

export default Item;
