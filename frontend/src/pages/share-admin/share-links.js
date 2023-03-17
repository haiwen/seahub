import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { Link } from '@gatsbyjs/reach-router';
import moment from 'moment';
import { Dropdown, DropdownToggle, DropdownItem, Button } from 'reactstrap';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import { isPro, gettext, siteRoot, canGenerateUploadLink } from '../../utils/constants';
import ShareLink from '../../models/share-link';
import ShareLinkPermissionEditor from '../../components/select-editor/share-link-permission-editor';
import Loading from '../../components/loading';
import toaster from '../../components/toast';
import EmptyTip from '../../components/empty-tip';
import ShareLinkPermissionSelect from '../../components/dialog/share-link-permission-select';
import ShareAdminLink from '../../components/dialog/share-admin-link';
import SortOptionsDialog from '../../components/dialog/sort-options';
import CommonOperationConfirmationDialog from '../../components/dialog/common-operation-confirmation-dialog';
import TopToolbar from '../../components/toolbar/top-toolbar';

const contentPropTypes = {
  loading: PropTypes.bool.isRequired,
  errorMsg: PropTypes.string.isRequired,
  items: PropTypes.array.isRequired,
  sortBy: PropTypes.string.isRequired,
  sortOrder: PropTypes.string.isRequired,
  sortItems: PropTypes.func.isRequired,
  onRemoveLink: PropTypes.func.isRequired
};

class Content extends Component {

  sortByName = (e) => {
    e.preventDefault();
    const sortBy = 'name';
    const sortOrder = this.props.sortOrder == 'asc' ? 'desc' : 'asc';
    this.props.sortItems(sortBy, sortOrder);
  }

  sortByTime = (e) => {
    e.preventDefault();
    const sortBy = 'time';
    const sortOrder = this.props.sortOrder == 'asc' ? 'desc' : 'asc';
    this.props.sortItems(sortBy, sortOrder);
  }

  render() {
    const { loading, errorMsg, items, sortBy, sortOrder } = this.props;

    if (loading) {
      return <Loading />;
    } else if (errorMsg) {
      return <p className="error text-center">{errorMsg}</p>;
    } else {
      const emptyTip = (
        <EmptyTip>
          <h2>{gettext('No share links')}</h2>
          <p>{gettext('You have not created any share links yet. A share link can be used to share files and folders with anyone. You can create a share link for a file or folder by clicking the share icon to the right of its name.')}</p>
        </EmptyTip>
      );

      // sort
      const sortByName = sortBy == 'name';
      const sortByTime = sortBy == 'time';
      const sortIcon = sortOrder == 'asc' ? <span className="fas fa-caret-up"></span> : <span className="fas fa-caret-down"></span>;

      const isDesktop = Utils.isDesktop();
      // only for some columns
      const columnWidths = isPro ? ['14%', '7%', '14%'] : ['21%', '14%', '20%'];
      const table = (
        <table className={`table-hover ${isDesktop ? '': 'table-thead-hidden'}`}>
          <thead>
            {isDesktop ? (
              <tr>
                <th width="4%">{/*icon*/}</th>
                <th width="31%"><a className="d-block table-sort-op" href="#" onClick={this.sortByName}>{gettext('Name')} {sortByName && sortIcon}</a></th>
                <th width={columnWidths[0]}>{gettext('Library')}</th>
                {isPro && <th width="20%">{gettext('Permission')}</th>}
                <th width={columnWidths[1]}>{gettext('Visits')}</th>
                <th width={columnWidths[2]}><a className="d-block table-sort-op" href="#" onClick={this.sortByTime}>{gettext('Expiration')} {sortByTime && sortIcon}</a></th>
                <th width="10%">{/*Operations*/}</th>
              </tr>
            ) : (
              <tr>
                <th width="12%"></th>
                <th width="80%"></th>
                <th width="8%"></th>
              </tr>
            )}
          </thead>
          <tbody>
            {items.map((item, index) => {
              return (<Item key={index} isDesktop={isDesktop} item={item} onRemoveLink={this.props.onRemoveLink} />);
            })}
          </tbody>
        </table>
      );

      return items.length ? table : emptyTip;
    }
  }
}

Content.propTypes = contentPropTypes;

const itemPropTypes = {
  item: PropTypes.object.isRequired,
  isDesktop: PropTypes.bool.isRequired,
  onRemoveLink: PropTypes.func.isRequired
};

class Item extends Component {

  constructor(props) {
    super(props);

    this.state = {
      isOpIconShown: false,
      isOpMenuOpen: false, // for mobile
      isPermSelectDialogOpen: false, // for mobile
      isLinkDialogOpen: false,
      permissionOptions: [],
      currentPermission: '',
    };
  }

  componentDidMount() {
    if (isPro) {
      this.updatePermissionOptions();
    }
  }

  updatePermissionOptions = () => {
    const item = this.props.item;
    let itemType = item.is_dir ? (item.path === '/' ? 'library' : 'dir') : 'file';
    let permission = item.repo_folder_permission;
    let permissionOptions = Utils.getShareLinkPermissionList(itemType, permission, item.path, item.can_edit);
    let currentPermission = Utils.getShareLinkPermissionStr(this.props.item.permissions);
    this.setState({
      permissionOptions: permissionOptions,
      currentPermission: currentPermission
    });
  }

  toggleOpMenu = () => {
    this.setState({
      isOpMenuOpen: !this.state.isOpMenuOpen
    });
  }

  togglePermSelectDialog = () => {
    this.setState({
      isPermSelectDialogOpen: !this.state.isPermSelectDialogOpen
    });
  }

  toggleLinkDialog = () => {
    this.setState({
      isLinkDialogOpen: !this.state.isLinkDialogOpen
    });
  }

  handleMouseOver = () => {
    this.setState({isOpIconShown: true});
  }

  handleMouseOut = () => {
    this.setState({isOpIconShown: false});
  }

  viewLink = (e) => {
    e.preventDefault();
    this.toggleLinkDialog();
  }

  removeLink = (e) => {
    e.preventDefault();
    this.props.onRemoveLink(this.props.item);
  }

  renderExpiration = () => {
    const item = this.props.item;
    if (!item.expire_date) {
      return '--';
    }
    const expire_date = moment(item.expire_date).format('YYYY-MM-DD');
    const expire_time = moment(item.expire_date).format('YYYY-MM-DD HH:mm:ss');
    return (<span className={item.is_expired ? 'error' : ''} title={expire_time}>{expire_date}</span>);
  }

  changePerm = (permission) => {
    const item = this.props.item;
    const permissionDetails = Utils.getShareLinkPermissionObject(permission).permissionDetails;
    seafileAPI.updateShareLink(item.token, JSON.stringify(permissionDetails)).then(() => {
      this.setState({
        currentPermission: permission
      });
      let message = gettext('Successfully modified permission.');
      toaster.success(message);
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  render() {
    const item = this.props.item;
    const { currentPermission, permissionOptions , isOpIconShown, isPermSelectDialogOpen, isLinkDialogOpen } = this.state;

    let iconUrl, objUrl;
    if (item.is_dir) {
      let path = item.path === '/' ? '/' : item.path.slice(0, item.path.length - 1);
      iconUrl = Utils.getFolderIconUrl(false);
      objUrl = `${siteRoot}library/${item.repo_id}/${encodeURIComponent(item.repo_name)}${Utils.encodePath(path)}`;
    } else {
      iconUrl = Utils.getFileIconUrl(item.obj_name);
      objUrl = `${siteRoot}lib/${item.repo_id}/file${Utils.encodePath(item.path)}`;
    }

    const deletedTip = item.obj_id === '' ? <span style={{color:'red'}}>{gettext('(deleted)')}</span> : null;
    const desktopItem = (
      <tr onMouseEnter={this.handleMouseOver} onMouseLeave={this.handleMouseOut} onFocus={this.handleMouseOver}>
        <td><img src={iconUrl} width="24" alt="" /></td>
        <td>
          {item.is_dir ?
            <Link to={objUrl}>{item.obj_name}</Link> :
            <a href={objUrl} target="_blank" rel="noreferrer">{item.obj_name}</a>
          }
          {deletedTip}
        </td>
        <td><Link to={`${siteRoot}library/${item.repo_id}/${encodeURIComponent(item.repo_name)}/`}>{item.repo_name}</Link></td>
        {isPro &&
        <td>
          <ShareLinkPermissionEditor
            isTextMode={true}
            isEditIconShow={isOpIconShown && !item.is_expired}
            currentPermission={currentPermission}
            permissionOptions={permissionOptions}
            onPermissionChanged={this.changePerm}
          />
        </td>
        }
        <td>{item.view_cnt}</td>
        <td>{this.renderExpiration()}</td>
        <td>
          {!item.is_expired && <a href="#" className={`sf2-icon-link action-icon ${isOpIconShown ? '': 'invisible'}`} title={gettext('View')} aria-label={gettext('View')} role="button" onClick={this.viewLink}></a>}
          <a href="#" className={`sf2-icon-delete action-icon ${isOpIconShown ? '': 'invisible'}`} title={gettext('Remove')} aria-label={gettext('Remove')} role="button" onClick={this.removeLink}></a>
        </td>
      </tr>
    );

    const mobileItem = (
      <Fragment>
        <tr>
          <td><img src={iconUrl} alt="" width="24" /></td>
          <td>
            {item.is_dir ?
              <Link to={objUrl}>{item.obj_name}</Link> :
              <a href={objUrl} target="_blank" rel="noreferrer">{item.obj_name}</a>
            }
            {isPro && <span className="item-meta-info-highlighted">{Utils.getShareLinkPermissionObject(currentPermission).text}</span>}
            <br />
            <span>{item.repo_name}</span><br />
            <span className="item-meta-info">{gettext('Visits')}: {item.view_cnt}</span>
            <span className="item-meta-info">{gettext('Expiration')}: {this.renderExpiration()}</span>
          </td>
          <td>
            <Dropdown isOpen={this.state.isOpMenuOpen} toggle={this.toggleOpMenu}>
              <DropdownToggle
                tag="i"
                className="sf-dropdown-toggle fa fa-ellipsis-v ml-0"
                title={gettext('More Operations')}
                data-toggle="dropdown"
                aria-expanded={this.state.isOpMenuOpen}
              />
              <div className={this.state.isOpMenuOpen ? '' : 'd-none'} onClick={this.toggleOpMenu}>
                <div className="mobile-operation-menu-bg-layer"></div>
                <div className="mobile-operation-menu">
                  {(isPro && !item.is_expired) && <DropdownItem className="mobile-menu-item" onClick={this.togglePermSelectDialog}>{gettext('Permission')}</DropdownItem>}
                  {!item.is_expired && <DropdownItem className="mobile-menu-item" onClick={this.viewLink}>{gettext('View')}</DropdownItem>}
                  <DropdownItem className="mobile-menu-item" onClick={this.removeLink}>{gettext('Remove')}</DropdownItem>
                </div>
              </div>
            </Dropdown>
          </td>
        </tr>
        {isPermSelectDialogOpen &&
        <ShareLinkPermissionSelect
          currentPerm={currentPermission}
          permissions={permissionOptions}
          changePerm={this.changePerm}
          toggleDialog={this.togglePermSelectDialog}
        />
        }
      </Fragment>
    );

    return (
      <Fragment>
        {this.props.isDesktop ? desktopItem : mobileItem}
        {isLinkDialogOpen &&
        <ShareAdminLink
          link={item.link}
          toggleDialog={this.toggleLinkDialog}
        />
        }
      </Fragment>
    );
  }
}

Item.propTypes = itemPropTypes;

const propTypes = {
  onShowSidePanel: PropTypes.func.isRequired,
  onSearchedClick: PropTypes.func.isRequired
};

class ShareAdminShareLinks extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isCleanInvalidShareLinksDialogOpen: false,
      loading: true,
      errorMsg: '',
      items: [],
      sortBy: 'name', // 'name' or 'time'
      sortOrder: 'asc' // 'asc' or 'desc'
    };

    // for mobile
    this.sortOptions = [
      {value: 'name-asc', text: gettext('By name ascending')},
      {value: 'name-desc', text: gettext('By name descending')},
      {value: 'time-asc', text: gettext('By expiration ascending')},
      {value: 'time-desc', text: gettext('By expiration descending')}
    ];
  }

  _sortItems = (items, sortBy, sortOrder) => {
    let comparator;

    switch (`${sortBy}-${sortOrder}`) {
      case 'name-asc':
        comparator = function(a, b) {
          var result = Utils.compareTwoWord(a.obj_name, b.obj_name);
          return result;
        };
        break;
      case 'name-desc':
        comparator = function(a, b) {
          var result = Utils.compareTwoWord(a.obj_name, b.obj_name);
          return -result;
        };
        break;
      case 'time-asc':
        comparator = function(a, b) {
          return a.expire_date < b.expire_date ? -1 : 1;
        };
        break;
      case 'time-desc':
        comparator = function(a, b) {
          return a.expire_date < b.expire_date ? 1 : -1;
        };
        break;

      // no default
    }

    items.sort((a, b) => {
      if (a.is_dir && !b.is_dir) {
        return -1;
      } else if (!a.is_dir && b.is_dir) {
        return 1;
      } else {
        return comparator(a, b);
      }
    });
    return items;
  }

  sortItems = (sortBy, sortOrder) => {
    this.setState({
      sortBy: sortBy,
      sortOrder: sortOrder,
      items: this._sortItems(this.state.items, sortBy, sortOrder)
    });
  }

  componentDidMount() {
    this.listUserShareLinks();
  }

  listUserShareLinks() {
    seafileAPI.listUserShareLinks().then((res) => {
      let items = res.data.map(item => {
        return new ShareLink(item);
      });
      this.setState({
        loading: false,
        items: this._sortItems(items, this.state.sortBy, this.state.sortOrder)
      });
    }).catch((error) => {
      this.setState({
        loading: false,
        errorMsg: Utils.getErrorMsg(error, true) // true: show login tip if 403
      });
    });
  }

  onRemoveLink = (item) => {
    seafileAPI.deleteShareLink(item.token).then(() => {
      let items = this.state.items.filter(uploadItem => {
        return uploadItem.token !== item.token;
      });
      this.setState({items: items});
      let message = gettext('Successfully deleted 1 item.');
      toaster.success(message);
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  toggleSortOptionsDialog = () => {
    this.setState({
      isSortOptionsDialogOpen: !this.state.isSortOptionsDialogOpen
    });
  }

  toggleCleanInvalidShareLinksDialog = () => {
    this.setState({isCleanInvalidShareLinksDialogOpen: !this.state.isCleanInvalidShareLinksDialogOpen});
  }

  cleanInvalidShareLinks = () => {
    seafileAPI.cleanInvalidShareLinks().then(res => {
      const newItems = this.state.items.filter(item => item.obj_id !== '').filter(item => !item.is_expired);
      this.setState({items: newItems});
      toaster.success(gettext('Successfully cleaned invalid share links.'));
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  render() {
    return (
      <Fragment>
        <TopToolbar
          onShowSidePanel={this.props.onShowSidePanel}
          onSearchedClick={this.props.onSearchedClick}
        >

          <Button className="operation-item d-none d-md-block" onClick={this.toggleCleanInvalidShareLinksDialog}>{gettext('Clean invalid share links')}</Button>
        </TopToolbar>
        <div className="main-panel-center">
          <div className="cur-view-container">
            <div className="cur-view-path share-upload-nav">
              <ul className="nav">
                <li className="nav-item">
                  <Link to={`${siteRoot}share-admin-share-links/`} className="nav-link active">{gettext('Share Links')}</Link>
                </li>
                {canGenerateUploadLink && (
                  <li className="nav-item"><Link to={`${siteRoot}share-admin-upload-links/`} className="nav-link">{gettext('Upload Links')}</Link></li>
                )}
              </ul>
              {(!Utils.isDesktop() && this.state.items.length > 0) && <span className="sf3-font sf3-font-sort action-icon" onClick={this.toggleSortOptionsDialog}></span>}
            </div>
            <div className="cur-view-content">
              <Content
                loading={this.state.loading}
                errorMsg={this.state.errorMsg}
                items={this.state.items}
                sortBy={this.state.sortBy}
                sortOrder={this.state.sortOrder}
                sortItems={this.sortItems}
                onRemoveLink={this.onRemoveLink}
              />
            </div>
          </div>
        </div>
        {this.state.isSortOptionsDialogOpen &&
        <SortOptionsDialog
          toggleDialog={this.toggleSortOptionsDialog}
          sortBy={this.state.sortBy}
          sortOrder={this.state.sortOrder}
          sortOptions={this.sortOptions}
          sortItems={this.sortItems}
        />
        }
        {this.state.isCleanInvalidShareLinksDialogOpen &&
          <CommonOperationConfirmationDialog
            title={gettext('Clean invalid share links')}
            message={gettext('Are you sure you want to clean invalid share links?')}
            executeOperation={this.cleanInvalidShareLinks}
            confirmBtnText={gettext('Clean')}
            toggleDialog={this.toggleCleanInvalidShareLinksDialog}
          />
        }
      </Fragment>
    );
  }
}

ShareAdminShareLinks.propTypes = propTypes;

export default ShareAdminShareLinks;
