import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import { Dropdown, DropdownMenu, DropdownToggle, DropdownItem } from 'reactstrap';
import { Utils } from '../../utils/utils';
import { gettext, siteRoot, isPro, username, folderPermEnabled } from '../../utils/constants';

const propTypes = {
  repo: PropTypes.object.isRequired,
  isItemFreezed: PropTypes.bool.isRequired,
  isShowRepoOwner: PropTypes.bool.isRequired,
  currentGroup: PropTypes.object.isRequired
};

class RepoListItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      highlight: false,
      isOperationShow: false,
      isItemMenuShow: false,
    };
  }

  onMouseEnter = () => {
    this.setState({
      highlight: true,
      isOperationShow: true,
    });
  }
  
  onMouseLeave = () => {
    this.setState({
      highlight: false,
      isOperationShow: false,
    });
  }

  toggleOperationMenu = () => {
    this.setState({
      isItemMenuShow: !this.state.isItemMenuShow
    });
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

  generatorOperations = () => {
    let { repo, currentGroup } = this.props;
    let isStaff = currentGroup.admins.indexOf(username) > -1; //for group repolist;
    let isRepoOwner = repo.owner_email === username;
    let isAdmin = repo.is_admin;

    let iconVisibility = this.state.isOperationShow ? '' : ' invisible';
    let shareIconClassName = 'sf2-icon-share sf2-x repo-share-btn op-icon' + iconVisibility; 
    let unshareIconClassName = 'sf2-icon-x3 sf2-x op-icon' + iconVisibility; 
    let deleteIconClassName = 'sf2-icon-delete sf2-x op-icon' + iconVisibility;
    let operationMenuToggleIconClassName = 'sf2-icon-caret-down item-operation-menu-toggle-icon op-icon';
    if (window.innerWidth >= 768) {
      operationMenuToggleIconClassName += iconVisibility;
    }

    const commonToggle = (
      <DropdownToggle
        tag="a" 
        href="#" 
        className={operationMenuToggleIconClassName} 
        title={gettext('More Operations')}
        onClick={this.clickOperationMenuToggle}
        data-toggle="dropdown" 
        aria-expanded={this.state.isItemMenuShow}
      >
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
      if (repo.owner_email.indexOf('@seafile_group') != -1) { // group owned repo
        if (isStaff) {
          if (repo.owner_email == currentGroup.id + '@seafile_group') { // this repo belongs to the current group
            desktopOperations = (
              <Fragment>
                {share}
                <a href="#" className={deleteIconClassName} title={gettext('Delete')} onClick={this.deleteItem}></a>
                <Dropdown isOpen={this.state.isOperationShow} toggle={this.toggleOperationMenu}>
                  {commonToggle}
                  <DropdownMenu>
                    {commonOperationsInMenu}
                  </DropdownMenu>
                </Dropdown>
              </Fragment>
            );
            mobileOperationMenu = (
              <Fragment>
                {shareDropdownItem}
                <DropdownItem onClick={this.deleteItem}>{gettext('Delete')}</DropdownItem>
                {commonOperationsInMenu}
              </Fragment>
            );
          } else {
            desktopOperations = unshare;
            mobileOperationMenu = unshareDropdownItem;
          }
        }
      } else {
        desktopOperations = (
          <Fragment>
            {isRepoOwner || isAdmin ? share : null}
            {isStaff || isRepoOwner || isAdmin ? unshare : null}
          </Fragment>
        );
        mobileOperationMenu = (
          <Fragment>
            {isRepoOwner || isAdmin ? shareDropdownItem : null}
            {isStaff || isRepoOwner || isAdmin ? unshareDropdownItem : null}
          </Fragment>
        );
      }
    } else {
      desktopOperations = (
        <Fragment>
          {isRepoOwner ? share : null}
          {isStaff || isRepoOwner ? unshare : null}
        </Fragment>
      );
      mobileOperationMenu = (
        <Fragment>
          {isRepoOwner ? shareDropdownItem : null}
          {isStaff || isRepoOwner ? unshareDropdownItem : null}
        </Fragment>
      );
    }

    const mobileOperations = (
      <Dropdown isOpen={this.state.isOperationShow} toggle={this.toggleOperationMenu}>
        {commonToggle}
        <div className={`${this.state.isItemMenuShow?'':'d-none'}`} onClick={this.toggleOperationMenu}>
          <div className="mobile-operation-menu-bg-layer"></div>
          <div className="mobile-operation-menu">
            {mobileOperationMenu}
          </div>
        </div>
      </Dropdown>
    );

    return { desktopOperations, mobileOperations }
  }

  renderPCUI = () => {
    let { iconUrl, iconTitle, libPath } = this.getRepoComputeParams();
    let { repo, isShowRepoOwner } = this.props;
    let { desktopOperations } = this.generatorOperations();
    return (
      <tr className={this.state.highlight ? 'tr-highlight' : ''} onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave}>
        <td><img src={iconUrl} title={repo.iconTitle} alt={iconTitle} width="24" /></td>
        <td><a href={libPath}>{repo.repo_name}</a></td>
        <td>{desktopOperations}</td>
        <td>{repo.size}</td>
        <td title={moment(repo.last_modified).format('llll')}>{moment(repo.last_modified).fromNow()}</td>
        {isShowRepoOwner && <td title={repo.owner_contact_email}>{repo.owner_name}</td>}
      </tr>
    );
  }
  
  renderMobileUI = () => {
    let { iconUrl, iconTitle, libPath } = this.getRepoComputeParams();
    let { repo, isShowRepoOwner } = this.props;
    let { mobileOperations } = this.generatorOperations();
    return (
      <tr className={this.state.highlight ? 'tr-highlight' : ''}  onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave}>
        <td><img src={iconUrl} title={iconTitle} alt={iconTitle}/></td>
        <td>
          <a href={libPath}>{repo.repo_name}</a><br />
          {isShowRepoOwner ? <span className="item-meta-info" title={repo.owner_contact_email}>{repo.owner_name}</span> : null}
          <span className="item-meta-info">{repo.size}</span>
          <span className="item-meta-info" title={moment(repo.last_modified).format('llll')}>{moment(repo.last_modified).fromNow()}</span>
        </td>
        <td>{mobileOperations}</td>
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

RepoListItem.propTypes = propTypes;

export default RepoListItem;
