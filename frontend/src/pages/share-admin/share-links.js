import React, { Component, Fragment } from 'react';
import { Link } from '@reach/router';
import moment from 'moment';
import { Dropdown, DropdownToggle, DropdownItem } from 'reactstrap';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import { isPro, gettext, siteRoot, loginUrl, canGenerateUploadLink } from '../../utils/constants';
import ShareLink from '../../models/share-link';
import ShareLinkPermissionEditor from '../../components/select-editor/share-link-permission-editor';
import Loading from '../../components/loading';
import toaster from '../../components/toast';
import EmptyTip from '../../components/empty-tip';
import ShareLinkPermissionSelect from '../../components/dialog/share-link-permission-select';
import ShareAdminLink from '../../components/dialog/share-admin-link';

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
          <h2>{gettext('You don\'t have any share links')}</h2>
          <p>{gettext('You can generate a share link for a folder or a file. Anyone who receives this link can view the folder or the file online.')}</p>
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
    if (item.is_dir && item.path === '/') {
      let permissionOptions = Utils.getShareLinkPermissionList('library', '', item.path);
      this.setState({
        permissionOptions: permissionOptions,
      });
    } else {
      let { repo_id, path } = item;
      let getDirentInfoAPI = item.is_dir ? seafileAPI.getDirInfo(repo_id, path) : seafileAPI.getFileInfo(repo_id, path);
      getDirentInfoAPI.then((res) => {
        let itemType = item.is_dir ? 'dir' : 'file';
        let permission = res.data.permission;
        let permissionOptions = Utils.getShareLinkPermissionList(itemType, permission, item.path);
        this.setState({
          permissionOptions: permissionOptions,
        });
      }).catch(error => {
        let errMessage = Utils.getErrorMsg(error);
        toaster.danger(errMessage);
      });
    }
    this.setState({
      currentPermission: this.getCurrentPermission(),
    });
  }

  getCurrentPermission = () => {
    const { can_edit, can_download } = this.props.item.permissions;
    switch (`${can_edit} ${can_download}`) {
      case 'false true':
        return 'preview_download';
      case 'false false':
        return 'preview_only';
      case 'true true':
        return 'edit_download';
      case 'true false':
        return 'cloud_edit';
    }
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
    let item = this.props.item;
    if (!item.expire_date) {
      return (
        <Fragment>--</Fragment>
      );
    }
    let expire_date = moment(item.expire_date).format('YYYY-MM-DD');
    return (
      <Fragment>
        {item.is_expired ? 
          <span className="error">{expire_date}</span> : expire_date
        }
      </Fragment>
    );
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

    const desktopItem = (
      <tr onMouseEnter={this.handleMouseOver} onMouseLeave={this.handleMouseOut}>
        <td><img src={iconUrl} width="24" alt="" /></td>
        <td>
          {item.is_dir ?
            <Link to={objUrl}>{item.obj_name}</Link> :
            <a href={objUrl} target="_blank">{item.obj_name}</a>
          }
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
          {!item.is_expired && <a href="#" className={`sf2-icon-link action-icon ${isOpIconShown ? '': 'invisible'}`} title={gettext('View')} onClick={this.viewLink}></a>}
          <a href="#" className={`sf2-icon-delete action-icon ${isOpIconShown ? '': 'invisible'}`} title={gettext('Remove')} onClick={this.removeLink}></a>
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
              <a href={objUrl} target="_blank">{item.obj_name}</a>
            }
            {isPro && <span className="item-meta-info-highlighted">{Utils.getShareLinkPermissionObject(currentPermission).text}</span>}
            <br />
            <span>{item.repo_name}</span><br />
            <span className="item-meta-info">{item.view_cnt}<span className="small text-secondary">({gettext('Visits')})</span></span>
            <span className="item-meta-info">{this.renderExpiration()}<span className="small text-secondary">({gettext('Expiration')})</span></span>
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

class ShareAdminShareLinks extends Component {

  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: '',
      items: [],
      sortBy: 'name', // 'name' or 'time'
      sortOrder: 'asc' // 'asc' or 'desc'
    };
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
    seafileAPI.listShareLinks().then((res) => {
      let items = res.data.map(item => {
        return new ShareLink(item);
      });
      this.setState({
        loading: false,
        items: this._sortItems(items, this.state.sortBy, this.state.sortOrder)
      });
    }).catch((error) => {
      if (error.response) {
        if (error.response.status == 403) {
          this.setState({
            loading: false,
            errorMsg: gettext('Permission denied')
          });
          location.href = `${loginUrl}?next=${encodeURIComponent(location.href)}`;
        } else {
          this.setState({
            loading: false,
            errorMsg: gettext('Error')
          });
        }
      } else {
        this.setState({
          loading: false,
          errorMsg: gettext('Please check the network.')
        });
      }
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

  render() {
    return (
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
    );
  }
}

export default ShareAdminShareLinks;
